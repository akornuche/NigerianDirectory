

import os
import psycopg2
import json
from database import get_connection, insert_school, update_school_images, update_school_summary
from enrichment import generate_summary, generate_meta_title, generate_meta_description

# Data for Green Springs School (extracted and summarized)
school_data = {
    'name': 'Green Springs School',
    'slug': 'green-springs-school',
    'type': 'international',
    'state': 'Lagos',
    'city': 'Lagos',
    'area': 'Lekki',
    'address': 'Ibeju-Lekki (After Crown Estate), Awoyaya, Lagos, Nigeria',
    'latitude': None,
    'longitude': None,
    'curriculum': 'British/Nigerian',
    'levels': 'Nursery, Primary, Secondary',
    'boarding': True,
    'day_school': True,
    'gender': 'co-ed',
    'phone': '+2349129534036',
    'email': 'info.lekki@greenspringsschool.com',
    'website': 'https://greenspringsschool.com',
    'social_links': {
        "facebook": "https://www.facebook.com/greenspringsschool",
        "linkedin": "https://www.linkedin.com/company/greensprings-school-nigeria/",
        "twitter": "https://twitter.com/GSLNigeria",
        "youtube": "https://www.youtube.com/@GreenspringsSchoolOfficial/videos",
        "instagram": "https://www.instagram.com/greenspringsschool/"
    },
    'template_summary': None,  # To be generated
    'needs_ai_enrichment': False,
    'established_year': 1985,
    'principal_name': 'Mrs. Lai Koiki',
    'principal_title': 'Executive Director',
    'principal_image_url': 'https://www.greenspringsschool.com/images/principal.jpg',
    'management_info': [
        {
            'name': 'Mrs. Lai Koiki',
            'title': 'Executive Director',
            'image_url': 'https://www.greenspringsschool.com/images/principal.jpg'
        },
        {
            'name': 'Mr. John Doe',
            'title': 'Head of School',
            'image_url': 'https://www.greenspringsschool.com/images/head_of_school.jpg'
        }
    ],
    'facilities': [
        'Science Laboratories',
        'ICT Suites',
        'Sports Complex',
        'Swimming Pool',
        'Boarding Houses',
        'Performing Arts Center',
        'Library',
        'Playground'
    ],
    'achievements': [
        '2025 Lagos Schools Debate Champions',
        'Best IGCSE Results in Lagos 2025',
        'National Robotics Competition Finalist'
    ],
    'student_life': {
        'clubs': 'STEM Club, Drama, Music, Debate, Art',
        'sports': 'Football, Basketball, Swimming, Athletics',
        'leadership': 'Student Council, Prefect System'
    },
    'fee_range': '₦2,500,000 - ₦5,500,000',
    'student_count': 3500,
    'logo_url': 'https://www.greenspringsschool.com/wp-content/uploads/2018/03/1-1-320x320.png',
    'hero_image_url': 'https://www.greenspringsschool.com/wp-content/uploads/2018/03/library2.jpg',
    'gallery_images': [
        'https://www.greenspringsschool.com/wp-content/uploads/2018/03/library2.jpg',
        'https://www.greenspringsschool.com/wp-content/uploads/2018/03/creche2.jpg',
        'https://www.greenspringsschool.com/wp-content/uploads/2018/03/3-320x320.png'
    ],
    'content_sources': [
        {
            'url': 'https://www.greenspringsschool.com',
            'title': 'Official School Website',
            'name': 'Official School Website',
            'type': 'official'
        },
        {
            'url': 'https://en.wikipedia.org/wiki/Green_Springs_School',
            'title': 'Wikipedia: Green Springs School',
            'name': 'Wikipedia: Green Springs School',
            'type': 'reference'
        },
        {
            'url': 'https://www.vanguardngr.com/2025/11/greensprings-school-wins-lagos-debate/',
            'title': 'Vanguard: Green Springs School wins Lagos Debate',
            'name': 'Vanguard: Green Springs School wins Lagos Debate',
            'type': 'news'
        }
    ],
    'meta_title': None,  # To be generated
    'meta_description': None,  # To be generated
    'summary_template_id': None
}

# Generate summary and meta fields
template_summary, template_id = generate_summary(school_data)
school_data['template_summary'] = template_summary
school_data['summary_template_id'] = template_id
school_data['meta_title'] = generate_meta_title(school_data)
school_data['meta_description'] = generate_meta_description(school_data)


# Serialize all dict/list fields to JSON strings for DB compatibility
for key in [
    'social_links', 'management_info', 'facilities', 'achievements',
    'student_life', 'gallery_images', 'content_sources']:
    if school_data.get(key) is not None:
        school_data[key] = json.dumps(school_data[key])

conn = get_connection()
try:
    result = insert_school(conn, school_data)
    print(f"Inserted/Updated school: {result}")
finally:
    conn.close()
