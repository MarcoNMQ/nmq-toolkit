import type { FbPageEntry } from './store';

/** Shimano's full Facebook Page list (brand line × market), as given by
 *  Marco from Meta Business Settings on 2026-10-29. Seeded in by default so
 *  Shimano campaigns work out of the box — no manual paste needed. Ids are
 *  deterministic (derived from the Page ID itself) so re-seeding via a
 *  store migration never creates duplicates or orphans an already-picked
 *  facebook_page_ref. */
export const SHIMANO_FB_PAGES: FbPageEntry[] = [
  ['Shimano Tribal Hungary', '100224755907718'],
  ['Shimano Tribal Italy', '103416275115942'],
  ['Shimano-Fishing (LT - Lithuanian)', '104611984520072'],
  ['Shimano Hungary Fishing', '105317712056981'],
  ['Shimano Romania Tribal', '111566661411563'],
  ['Shimano Slovakia Fishing', '111574604755578'],
  ['Shimano Czech Fishing', '111970954713900'],
  ['Shimano-Fishing (EE - Estonian)', '112511420385700'],
  ['Shimano-Tribal (NL - Dutch, BE - French, Dutch, LU - Dutch, French, Luxembourgish)', '138446066574781'],
  ['Shimano-Fishing (IT - Italian)', '237789752986067'],
  ['Shimano-Predator (Default)', '252617195101854'],
  ['Shimano-Predator (DE - German)', '257244794639803'],
  ['Shimano Predator Italia (IT - Italian)', '298974613580753'],
  ['Shimano-Fishing (NL - Dutch, BE - French, Dutch, LU - Dutch, French, Luxembourgish)', '407354396043926'],
  ['Shimano-Fishing (DE - German)', '436507163105728'],
  ['Shimano-Tribal (Default)', '491167394282995'],
  ['Shimano-Tribal (FR - French)', '551134548378768'],
  ['Shimano-Fishing (PL - Polish)', '641491629299657'],
  ['Shimano Aero', '649751238969965'],
  ['Shimano-Fishing (Default)', '670628973069456'],
  ['Shimano Fishing Portugal', '718467668027162'],
  ['Shimano-Fishing (FR - French)', '744008922322330'],
  ['Shimano Fishing Nordics', '748734698329707'],
  ['Shimano-Fishing (ES - Spanish)', '966788143397123'],
  ['Shimano-Tribal (DE - German)', '1005423196207605'],
  ['Shimano-Fishing (GB - English)', '1229667467072974'],
  ['Shimano-Tribal (PL - Polish)', '1450206935043823'],
  ['Shimano-Predator (NL - Dutch, BE - French, Dutch, LU - Dutch, French, Luxembourgish)', '1451370218416500'],
  ['Shimano-Tribal (GB - English)', '1830305477240361'],
].map(([name, pageId]) => ({ id: `fb-${pageId}`, name, pageId }));
