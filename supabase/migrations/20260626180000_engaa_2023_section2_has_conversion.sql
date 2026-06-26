-- ENGAA 2023 Section 2: flag paper as having an official MCQ conversion table.
-- (2016–2018 ENGAA S2 are written/long-answer format — no conversion tables needed.)
UPDATE papers
SET has_conversion = true
WHERE exam_name = 'ENGAA'
  AND exam_year = 2023
  AND paper_name = 'Section 2'
  AND exam_type = 'Official';
