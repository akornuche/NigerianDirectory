UPDATE schools SET
  enriched_history = 'Green Springs School was founded in 1999 with a vision to provide world-class education in Nigeria. The school has grown from a small institution to one of Nigeria''s premier international schools, offering British and Nigerian curricula.',
  enriched_academics = 'The school offers a comprehensive curriculum combining the British National Curriculum with Nigerian requirements. Subjects include Mathematics, English, Sciences, Humanities, Arts, and Physical Education.',
  enriched_campus_info = 'Located in Lekki, Lagos, the school features modern facilities including science laboratories, computer labs, a library, sports facilities, and dedicated spaces for arts and music.',
  enriched_student_life = 'Students participate in various extracurricular activities including sports teams, drama club, music ensembles, and community service projects.',
  content_sources = '[{"name": "Official Website", "url": "https://greenspringsschool.com"}, {"name": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Green_Springs_School"}]',
  enrichment_status = 'completed',
  last_enriched = NOW()
WHERE slug = 'green-springs-school';