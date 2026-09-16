-- "קטגוריה ילדים" overlapped with "אטרקציות" in practice, so it's folded
-- in here — existing events must move off the value before it's removed
-- from the enum, since Postgres has no ALTER TYPE ... DROP VALUE. The
-- freed slot becomes "vouchers" (שוברים). Recoloring to attractions'
-- own gradient too, so a merged card doesn't keep the old kids pink.
UPDATE "Event" SET category = 'attractions', "gradientFrom" = '#EF9F27', "gradientTo" = '#FFC96B' WHERE category = 'kids';

CREATE TYPE "CategorySlug_new" AS ENUM ('concerts', 'standup', 'theater', 'sports', 'attractions', 'vouchers');
ALTER TABLE "Event" ALTER COLUMN "category" TYPE "CategorySlug_new" USING ("category"::text::"CategorySlug_new");
ALTER TYPE "CategorySlug" RENAME TO "CategorySlug_old";
ALTER TYPE "CategorySlug_new" RENAME TO "CategorySlug";
DROP TYPE "CategorySlug_old";
