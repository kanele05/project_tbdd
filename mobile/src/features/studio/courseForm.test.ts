import {
  cleanBenefits,
  courseFormSchema,
  EMPTY_COURSE_FORM,
  getInfoChanges,
  getPriceErrors,
  hasInfoChanges,
  mapServerFieldErrors,
  mergeUntouched,
  toCreateRequest,
  toRevisionInput,
  valuesFromDetail,
  withFields,
  type CourseFormValues,
} from './courseForm';
import { makeDetail, makeRevision } from './studioFixtures';

const VALID: CourseFormValues = {
  ...EMPTY_COURSE_FORM,
  title: 'React Native Bootcamp',
  categoryId: 'cat-1',
  price: '29.99',
};

describe('courseFormSchema', () => {
  it('accepts a valid form (free price allowed)', () => {
    expect(courseFormSchema.safeParse(VALID).success).toBe(true);
    expect(courseFormSchema.safeParse({ ...VALID, price: '' }).success).toBe(true);
  });

  it('reports a short title, a missing category, too many tags and a bad price', () => {
    const result = courseFormSchema.safeParse({
      ...VALID,
      title: 'Hi',
      categoryId: '',
      tagIds: ['1', '2', '3', '4', '5', '6'],
      price: '12.345',
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['title', 'categoryId', 'tagIds', 'price']));
  });
});

describe('valuesFromDetail', () => {
  it('reads the live course, with prices as USD text', () => {
    const values = valuesFromDetail(makeDetail({ priceCents: 2999, originalPriceCents: 5000 }));
    expect(values).toMatchObject({
      title: 'React Native Bootcamp',
      categoryId: 'cat-1',
      tagIds: ['tag-1'],
      price: '29.99',
      originalPrice: '50',
      subtitle: 'Ship real apps',
    });
  });

  it('takes the major fields from the open revision', () => {
    const revision = makeRevision('OPEN');
    revision.payload = {
      ...revision.payload,
      title: 'Better title',
      categoryId: 'cat-2',
      priceCents: 1999,
    };
    const values = valuesFromDetail(makeDetail({ status: 'PUBLISHED', revision }));
    expect(values).toMatchObject({
      title: 'Better title',
      categoryId: 'cat-2',
      tagIds: [],
      price: '19.99',
      originalPrice: '',
    });
  });
});

describe('getInfoChanges', () => {
  const initial = valuesFromDetail(makeDetail());

  it('is empty when nothing changed', () => {
    expect(getInfoChanges(initial, { ...initial })).toEqual({});
  });

  it('sends only what changed, converting prices to cents and blanks to null', () => {
    const changes = getInfoChanges(initial, {
      ...initial,
      title: '  New title here ',
      price: '10',
      originalPrice: '20',
      subtitle: '',
      benefits: ['One', '  '],
    });
    expect(changes).toEqual({
      title: 'New title here',
      priceCents: 1000,
      originalPriceCents: 2000,
      subtitle: null,
      benefits: ['One'],
    });
  });

  it('can be limited to the minor or the major fields', () => {
    const edited = { ...initial, title: 'Another title', description: 'Changed description text' };
    expect(getInfoChanges(initial, edited, 'minor')).toEqual({
      description: 'Changed description text',
    });
    expect(getInfoChanges(initial, edited, 'major')).toEqual({ title: 'Another title' });
  });
});

describe('request builders', () => {
  it('builds the create request with only the filled optional fields', () => {
    expect(toCreateRequest(VALID)).toEqual({
      title: 'React Native Bootcamp',
      categoryId: 'cat-1',
      priceCents: 2999,
      originalPriceCents: null,
      tagIds: [],
      benefits: [],
    });
    expect(
      toCreateRequest({ ...VALID, subtitle: 'Sub', thumbnailUrl: 'https://x/y.png' }),
    ).toMatchObject({ subtitle: 'Sub', thumbnailUrl: 'https://x/y.png' });
  });

  it('puts the major fields into the stored revision payload', () => {
    const payload = {
      title: 'Old',
      priceCents: 100,
      originalPriceCents: null,
      categoryId: 'a',
      tagIds: [],
      sections: [{ id: 's1', title: 'S', lessons: [] }],
    };
    expect(toRevisionInput(payload, { ...VALID, tagIds: ['t1'], originalPrice: '60' })).toEqual({
      title: 'React Native Bootcamp',
      priceCents: 2999,
      originalPriceCents: 6000,
      categoryId: 'cat-1',
      tagIds: ['t1'],
      sections: payload.sections,
    });
  });

  it('cleans benefits (trim, drop blanks, cap at 10)', () => {
    expect(cleanBenefits([' a ', '', 'b'])).toEqual(['a', 'b']);
    expect(cleanBenefits(Array.from({ length: 12 }, (_, i) => `x${i}`))).toHaveLength(10);
  });
});

describe('mapServerFieldErrors', () => {
  it('maps server field names onto form fields and drops unknown ones', () => {
    expect(
      mapServerFieldErrors({ priceCents: 'bad', 'benefits.2': 'long', foo: 'x', title: 't' }),
    ).toEqual({ price: 'bad', benefits: 'long', title: 't' });
  });
});

describe('withFields', () => {
  it('takes only the named fields from the source', () => {
    const saved = { ...VALID, subtitle: 'saved' };
    const edited = { ...VALID, title: 'Edited title', subtitle: 'edited' };
    expect(withFields(saved, edited, ['title'])).toEqual({ ...saved, title: 'Edited title' });
  });
});

describe('mergeUntouched', () => {
  it('keeps what the teacher edited and refreshes everything else', () => {
    const previous = { ...VALID, subtitle: 'old', description: 'old description' };
    const current = { ...previous, description: 'typed by the teacher' };
    const next = { ...previous, subtitle: 'new from server', description: 'server description' };
    expect(mergeUntouched(previous, current, next)).toEqual({
      ...next,
      description: 'typed by the teacher',
    });
  });
});

describe('hasInfoChanges', () => {
  it('is false for an untouched form and true after an edit', () => {
    expect(hasInfoChanges(VALID, { ...VALID, title: ' React Native Bootcamp ' })).toBe(false);
    expect(hasInfoChanges(EMPTY_COURSE_FORM, EMPTY_COURSE_FORM)).toBe(false);
    expect(hasInfoChanges(VALID, { ...VALID, subtitle: 'x' })).toBe(true);
  });
});

describe('getPriceErrors', () => {
  it('needs a price of at least $0.99 for a paid course', () => {
    expect(getPriceErrors({ ...VALID, price: '' }, true).price).toBeDefined();
    expect(getPriceErrors({ ...VALID, price: '0.5' }, true).price).toBeDefined();
    expect(getPriceErrors({ ...VALID, price: '0.99' }, true)).toEqual({});
  });

  it('needs an original price above the price', () => {
    expect(getPriceErrors({ ...VALID, originalPrice: '29.99' }, true).originalPrice).toBeDefined();
    expect(getPriceErrors({ ...VALID, originalPrice: '49' }, true)).toEqual({});
  });

  it('checks nothing for a free course', () => {
    expect(getPriceErrors({ ...VALID, price: '', originalPrice: '5' }, false)).toEqual({});
  });
});
