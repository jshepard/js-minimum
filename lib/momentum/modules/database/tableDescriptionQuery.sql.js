module.exports = `
SELECT
  t.table_catalog,
  t.table_schema,
  t.table_name,
  t.table_type,
  t.is_insertable_into,
  c.column_name,
  c.ordinal_position,
  c.column_default,
  c.is_nullable,
  c.data_type,
  c.character_maximum_length,
  c.character_octet_length,
  c.numeric_precision,
  c.numeric_precision_radix,
  c.numeric_scale,
  c.datetime_precision,
  c.is_updatable,
  tc.constraint_type,
  kcu.constraint_name
FROM INFORMATION_SCHEMA.TABLES t
  JOIN INFORMATION_SCHEMA.COLUMNS c
    ON  c.table_catalog = t.table_catalog
    AND c.table_schema = t.table_schema
    AND c.table_name = t.table_name
  LEFT OUTER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON  kcu.table_catalog = c.table_catalog
    AND kcu.table_schema = c.table_schema
    AND kcu.table_name = c.table_name
    AND kcu.column_name = c.column_name
  LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON  tc.table_catalog = c.table_catalog
    AND tc.table_schema = c.table_schema
    AND tc.table_name = c.table_name
    AND tc.constraint_name = kcu.constraint_name
  WHERE t.table_schema=$1
  ORDER BY
    t.table_catalog,
    t.table_schema,
    t.table_name,
    c.ordinal_position;
`
