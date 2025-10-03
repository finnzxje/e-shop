
BEGIN;

TRUNCATE TABLE
  product_tag_assignments,
  product_images,
  product_variants,
  product_external_refs,
  product_attribute_values,
  product_attributes,
  product_tags,
  products,
  categories,
  colors
RESTART IDENTITY CASCADE;

COMMIT;
