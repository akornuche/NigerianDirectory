"""Report how many enriched universities currently have a logo/hero image."""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager


def main():
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE logo_url IS NOT NULL) AS logo,
                       COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS hero,
                       COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') AS enriched
                FROM schools
                WHERE institution_category = 'university'
                """
            )
            row = cur.fetchone()
    finally:
        conn.close()

    print(f"total universities : {row['total']}")
    print(f"enriched (content) : {row['enriched']}")
    print(f"with logo_url      : {row['logo']}")
    print(f"with hero_image_url: {row['hero']}")


if __name__ == '__main__':
    main()
