import * as fs from 'fs';
import * as path from 'path';

/**
 * Contract tests for useTonightPlan — server-side fusion means the hook must not
 * upload mock features or pass featureSetId (see personalization plan).
 */
describe('useTonightPlan contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'useTonightPlan.ts'), 'utf8');

  it('does not import or call mock feature upload', () => {
    expect(source).not.toMatch(/buildFeatureUpload/);
    expect(source).not.toMatch(/uploadFeatures/);
    expect(source).not.toMatch(/featureUpload/);
  });

  it('does not accept client rollups for plan fetch', () => {
    expect(source).not.toMatch(/rollups\?:/);
    expect(source).not.toMatch(/rollups,/);
  });

  it('calls Google sync when connected but omits featureSetId on plan fetch', () => {
    expect(source).toMatch(/syncGoogleHealthAndUploadFeatures/);
    expect(source).toMatch(/fetchTonightPlan/);
    expect(source).not.toMatch(/featureSetId:/);
  });
});
