-- Add institution category to distinguish universities, polytechnics, etc from secondary schools
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS institution_category VARCHAR(50) DEFAULT 'school';

-- Update existing records to default 'school' (primary/secondary)
UPDATE schools SET institution_category = 'school' WHERE institution_category IS NULL;
