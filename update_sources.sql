UPDATE schools 
SET content_sources = '[
  {"url": "https://en.wikipedia.org/wiki/King_College,_Lagos", "title": "Kings College Lagos - Wikipedia", "type": "reference"},
  {"url": "https://kingscollege.ng", "title": "Kings College Lagos - Official Website", "type": "official"},
  {"url": "https://www.educeleb.com/kings-college-lagos", "title": "Kings College Lagos History and Facts", "type": "reference"},
  {"url": "https://www.nairaland.com/3456123/kings-college-lagos", "title": "Discussion about Kings College Lagos", "type": "reference"}
]'::jsonb 
WHERE slug = 'kings-college-lagos';
