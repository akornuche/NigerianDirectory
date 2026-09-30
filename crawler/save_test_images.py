#!/usr/bin/env python3
"""
Save the test images we found
"""

from database import db_manager

# Find Abeokuta Grammar School
schools = db_manager.get_schools_for_enrichment(limit=200)
ags_school = None

for school in schools:
    if 'abeokuta grammar' in school['name'].lower():
        ags_school = school
        break

if ags_school:
    print(f'Found school: {ags_school["name"]} (ID: {ags_school["id"]})')
    
    # Update with the found images
    success = db_manager.update_school_images(
        ags_school['id'],
        logo_url='https://i.ytimg.com/vi/_hs9NOdnaG0/hqdefault.jpg',
        hero_image_url='https://agsoba.org/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-07-at-06.27.53.jpeg'
    )
    
    if success:
        print('✅ Images saved to database successfully')
    else:
        print('❌ Failed to save images')
else:
    print('❌ School not found')