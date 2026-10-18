"""
Nigerian university roster sourced directly from the National Universities
Commission (NUC)'s own federal and private university list pages, with
state universities supplemented from Wikipedia's "List of universities in
Nigeria" (itself sourced from NUC's state list).

Sources fetched 2026-10-16:
  - https://www.nuc.edu.ng/nigerian-univeristy-system/federal-univeristies/
  - https://www.nuc.edu.ng/nigerian-univeristy-system/private-univeristies/
  - https://en.wikipedia.org/wiki/List_of_universities_in_Nigeria (state section)

NUC's own federal and private pages were used directly rather than any
third-party aggregator, since both were reachable and gave VC names,
official websites and founding years directly from the regulator. NUC's
dedicated state-university page could not be located at a stable URL in
this session (every guessed path 404'd), so Wikipedia's state list, which
itself cites NUC, was used for that category.

This is why the final counts do not exactly match the user's cited
52 federal / 58 state / 145 private = 255 figure: NUC's own site stated in
an October 2025 announcement that the national total had already reached
301 universities, and the federal and private lists fetched here (77 and
182 respectively) reflect that growth. The 255 figure predates several
recent waves of federal and private approvals.

website values are only included where NUC's page actually listed one;
many very recently approved institutions (2023-2026) have no listed site
yet, in which case the crawler's own website-discovery step will attempt
to find one at crawl time.
"""

# (name, city, state, website, established_year)
# website / established_year are None where NUC's own listing omitted them.
FEDERAL = [
    ("Abubakar Tafawa Balewa University", "Bauchi", "Bauchi", "https://www.atbu.edu.ng", 1988),
    ("Ahmadu Bello University", "Zaria", "Kaduna", "https://www.abu.edu.ng", 1962),
    ("Bayero University", "Kano", "Kano", "https://www.buk.edu.ng", 1975),
    ("Federal University Gashua", "Gashua", "Yobe", "https://www.fugashua.edu.ng", 2013),
    ("Federal University of Petroleum Resources", "Effurun", "Delta", "https://www.fupre.edu.ng", 2007),
    ("Federal University of Technology, Akure", "Akure", "Ondo", "https://www.futa.edu.ng", 1981),
    ("Federal University of Technology, Minna", "Minna", "Niger", "https://www.futminna.edu.ng", 1982),
    ("Federal University of Technology, Owerri", "Owerri", "Imo", "https://www.futo.edu.ng", 1980),
    ("Federal University, Dutse", "Dutse", "Jigawa", "https://www.fud.edu.ng", 2011),
    ("Federal University, Dutsin-Ma", "Dutsin-Ma", "Katsina", "https://www.fudutsinma.edu.ng", 2011),
    ("Federal University, Kashere", "Kashere", "Gombe", "https://www.fukashere.edu.ng", 2011),
    ("Federal University, Lafia", "Lafia", "Nasarawa", "https://www.fulafia.edu.ng", 2011),
    ("Federal University, Lokoja", "Lokoja", "Kogi", "https://www.fulokoja.edu.ng", 2011),
    # Removed: same institution already seeded as "Alex Ekwueme Federal
    # University, Ndufu-Alike".
    ("Federal University, Otuoke", "Otuoke", "Bayelsa", "https://www.fuotuoke.edu.ng", 2011),
    ("Federal University, Oye-Ekiti", "Oye-Ekiti", "Ekiti", "https://www.fuoye.edu.ng", 2011),
    ("Federal University, Wukari", "Wukari", "Taraba", "https://www.fuwukari.edu.ng", 2011),
    ("Federal University, Birnin Kebbi", "Birnin Kebbi", "Kebbi", "https://www.fubk.edu.ng", 2013),
    ("Federal University, Gusau", "Gusau", "Zamfara", "https://www.fugusau.edu.ng", 2013),
    ("Michael Okpara University of Agriculture, Umudike", "Umudike", "Abia", "https://www.mouau.edu.ng", 1992),
    # Removed: same institution already seeded as "Modibbo Adama University,
    # Yola".
    ("National Open University of Nigeria", "Abuja", "FCT", "https://www.nou.edu.ng", 2002),
    ("Nigeria Police Academy", "Wudil", "Kano", "https://polac.edu.ng", 2013),
    ("Nigerian Defence Academy", "Kaduna", "Kaduna", "https://www.nda.edu.ng", 1985),
    ("Nnamdi Azikiwe University", "Awka", "Anambra", "https://www.unizik.edu.ng", 1992),
    ("Obafemi Awolowo University", "Ile-Ife", "Osun", "https://www.oauife.edu.ng", 1962),
    ("University of Abuja", "Gwagwalada", "FCT", "https://www.uniabuja.edu.ng", 1988),
    ("Federal University of Agriculture, Abeokuta", "Abeokuta", "Ogun", "https://www.unaab.edu.ng", 1988),
    ("Joseph Sarwuan Tarka University", "Makurdi", "Benue", "https://www.uam.edu.ng", 1988),
    ("University of Benin", "Benin City", "Edo", "https://www.uniben.edu.ng", 1970),
    ("University of Calabar", "Calabar", "Cross River", "https://www.unical.edu.ng", 1975),
    ("University of Ibadan", "Ibadan", "Oyo", "https://www.ui.edu.ng", 1948),
    ("University of Ilorin", "Ilorin", "Kwara", "https://www.unilorin.edu.ng", 1975),
    ("University of Jos", "Jos", "Plateau", "https://www.unijos.edu.ng", 1975),
    ("University of Lagos", "Akoka", "Lagos", "https://www.unilag.edu.ng", 1962),
    ("University of Maiduguri", "Maiduguri", "Borno", "https://www.unimaid.edu.ng", 1975),
    # Removed: same institution already seeded as "University of Nigeria,
    # Enugu Campus" (UNN's main listing in the legacy seed data).
    ("University of Port-Harcourt", "Port Harcourt", "Rivers", "https://www.uniport.edu.ng", 1975),
    ("University of Uyo", "Uyo", "Akwa Ibom", "https://www.uniuyo.edu.ng", 1991),
    ("Usmanu Danfodiyo University", "Sokoto", "Sokoto", "https://www.udusok.edu.ng", 1975),
    ("Nigerian Maritime University", "Okerenkoko", "Delta", "https://www.nmu.edu.ng", 2018),
    ("Air Force Institute of Technology", "Kaduna", "Kaduna", "https://afit.edu.ng", 2018),
    ("Nigerian Army University", "Biu", "Borno", "https://naub.edu.ng", 2018),
    ("Federal University of Health Sciences, Otukpo", "Otukpo", "Benue", None, 2020),
    ("Federal University of Agriculture, Zuru", "Zuru", "Kebbi", None, 2020),
    ("Federal University of Technology, Babura", "Babura", "Jigawa", None, 2021),
    ("Federal University of Technology, Ikot Abasi", "Ikot Abasi", "Akwa Ibom", None, 2021),
    ("Federal University of Health Sciences, Azare", "Azare", "Bauchi", None, 2021),
    ("Federal University of Health Sciences, Ila Orangun", "Ila Orangun", "Osun", None, 2021),
    ("David Nweze Umahi Federal University of Medical Sciences, Uburu", "Uburu", "Ebonyi", "https://kdums.edu.ng", 2022),
    ("Admiralty University", "Ibusa", "Delta", "https://adun.edu.ng", 2023),
    ("Federal University of Transportation", "Daura", "Katsina", "https://www.futd.edu.ng", 2022),
    ("African Aviation and Aerospace University", "Abuja", "FCT", "https://aaau.edu.ng", 2023),
    ("National University of Science and Technology", "Abuja", "FCT", None, 2023),
    ("Federal University of Agriculture, Bassam-Biri", "Bassam-Biri", "Bayelsa", None, 2023),
    ("Federal University of Health Sciences, Kwale", "Kwale", "Delta", None, 2023),
    ("Federal University of Health Sciences", "Katsina", "Katsina", None, 2023),
    ("Federal University of Agriculture, Mubi", "Mubi", "Adamawa", None, 2023),
    ("Federal University of Education, Zaria", "Zaria", "Kaduna", None, 2023),
    ("Alvan Ikoku Federal University of Education", "Owerri", "Imo", None, 2023),
    ("Yusuf Maitama Sule Federal University of Education", "Kano", "Kano", None, 2023),
    ("Adeyemi Federal University of Education", "Ondo", "Ondo", None, 2023),
    ("Federal University of Allied Health Sciences", "Enugu", "Enugu", "https://fuahse.edu.ng", 2024),
    ("Federal University of Medicine and Medical Sciences, Abeokuta", "Abeokuta", "Ogun", "https://fummsa.net", 2023),
    ("Federal University of Education, Pankshin", "Pankshin", "Plateau", None, 2023),
    ("Federal University of Education, Kontagora", "Kontagora", "Niger", None, 2023),
    ("University of Maritime Studies", "Oron", "Akwa Ibom", None, 2024),
    ("Federal University of Environment and Technology", "Tai Town", "Rivers", None, 2025),
    ("Federal University of Applied Sciences, Kachia", "Kachia", "Kaduna", None, 2025),
    # "Tai Solarin Federal University of Education" removed: same
    # institution already seeded as "Tai Solarin University of Education"
    # (Ijebu Ode / Ijagun, Ogun).
    ("Federal University of Agriculture and Developmental Studies", "Iragbuji", "Osun", None, 2025),
    ("Federal University of Technology and Environmental Studies", "Iyin-Ekiti", "Ekiti", None, 2025),
    ("Federal University of Agriculture and Technology, Okeho", "Okeho", "Oyo", None, 2025),
    ("Federal University of Health Science and Technology, Tsafe", "Tsafe", "Zamfara", None, 2025),
    ("Federal University of Agriculture and Technology, Obio-Akpa", "Obio-Akpa", "Akwa Ibom", None, 2025),
    ("Federal University of Science and Technology, Epe", "Epe", "Lagos", None, 2025),
    ("Federal University of Science and Technology, Kabo", "Kabo", "Kano", "https://fustkabo.edu.ng", 2025),
]

PRIVATE = [
    ("Babcock University", "Ilishan-Remo", "Ogun", "https://www.babcock.edu.ng", 1999),
    ("Igbinedion University", "Okada", "Edo", "https://www.iuokada.edu.ng", 1999),
    ("Madonna University", "Okija", "Anambra", "https://www.madonnauniversity.edu.ng", 1999),
    ("Bowen University", "Iwo", "Osun", "https://www.bowen.edu.ng", 2001),
    ("Benson Idahosa University", "Benin City", "Edo", "https://www.biu.edu.ng", 2002),
    ("Covenant University", "Ota", "Ogun", "https://www.covenantuniversity.edu.ng", 2002),
    ("Pan-Atlantic University", "Lagos", "Lagos", "https://www.pau.edu.ng", 2002),
    ("American University of Nigeria", "Yola", "Adamawa", "https://www.aun.edu.ng", 2003),
    ("Ajayi Crowther University", "Ibadan", "Oyo", "https://www.acu.edu.ng", 2005),
    ("Al-Hikmah University", "Ilorin", "Kwara", "https://www.alhikmah.edu.ng", 2005),
    ("Al-Qalam University", "Katsina", "Katsina", "https://www.auk.edu.ng", 2005),
    ("Bells University of Technology", "Otta", "Ogun", "https://www.bellsuniversity.edu.ng", 2005),
    ("Bingham University", "New Karu", "Nasarawa", "https://www.binghamuni.edu.ng", 2005),
    ("Caritas University", "Enugu", "Enugu", "https://www.caritasuni.edu.ng", 2005),
    ("Crawford University", "Igbesa", "Ogun", "https://www.crawforduniversity.edu.ng", 2005),
    ("Crescent University", "Abeokuta", "Ogun", "https://www.crescent-university.edu.ng", 2005),
    ("Kwararafa University", "Wukari", "Taraba", "https://www.kwararafauniversity.edu.ng", 2005),
    ("Lead City University", "Ibadan", "Oyo", "https://www.lcu.edu.ng", 2005),
    ("Novena University", "Ogume", "Delta", "https://www.novenauniversity.edu.ng", 2005),
    ("Redeemer's University", "Ede", "Osun", "https://www.run.edu.ng", 2005),
    ("Renaissance University", "Enugu", "Enugu", "https://www.rnu.edu.ng", 2005),
    ("University of Mkar", "Mkar", "Benue", "https://www.unimkar.edu.ng", 2005),
    ("Joseph Ayo Babalola University", "Ikeji-Arakeji", "Osun", "https://www.jabu.edu.ng", 2006),
    ("Achievers University", "Owo", "Ondo", "https://www.achievers.edu.ng", 2007),
    ("Caleb University", "Lagos", "Lagos", "https://www.calebuniversity.edu.ng", 2007),
    ("Fountain University", "Osogbo", "Osun", "https://www.fuo.edu.ng", 2007),
    ("African University of Science and Technology", "Abuja", "FCT", "http://aust.edu.ng", 2007),
    ("Obong University", "Obong Ntak", "Akwa Ibom", "https://www.obonguniversity.net", 2007),
    ("Salem University", "Lokoja", "Kogi", "https://www.salemuniversity.edu.ng", 2007),
    ("Tansian University", "Umunya", "Anambra", "https://tansianuniversity.edu.ng", 2007),
    ("Veritas University", "Abuja", "FCT", "https://www.veritas.edu.ng", 2007),
    ("Wesley University", "Ondo", "Ondo", "https://www.wesleyuni.edu.ng", 2007),
    ("Western Delta University", "Oghara", "Delta", "https://wdu.edu.ng", 2007),
    ("Afe Babalola University", "Ado-Ekiti", "Ekiti", "https://www.abuad.edu.ng", 2009),
    ("Godfrey Okoye University", "Ugwuomu-Nike", "Enugu", "https://www.gouni.edu.ng", 2009),
    ("Nile University of Nigeria", "Abuja", "FCT", "https://www.nileuniversity.edu.ng", 2009),
    ("Oduduwa University", "Ipetumodu", "Osun", "https://www.oduduwauniversity.edu.ng", 2009),
    ("Paul University", "Awka", "Anambra", "https://www.pauluniversity.edu.ng", 2009),
    ("Rhema University", "Obeama-Asa", "Rivers", "https://www.rhemauniversity.edu.ng", 2009),
    ("Wellspring University", "Evbuobanosa", "Edo", "https://www.wellspringuniversity.net", 2009),
    ("Adeleke University", "Ede", "Osun", "https://www.adelekeuniversity.edu.ng", 2011),
    ("Baze University", "Abuja", "FCT", "https://www.bazeuniversity.edu.ng", 2011),
    ("Landmark University", "Omu-Aran", "Kwara", "https://www.lmu.edu.ng", 2011),
    ("Glorious Vision University", "Ogwa", "Edo", "https://www.sau.edu.ng", 2011),
    ("Elizade University", "Ilara-Mokin", "Ondo", "https://www.elizadeuniversity.edu.ng", 2012),
    ("Evangel University, Akaeze", "Akaeze", "Ebonyi", "https://www.evangeluniversity.edu.ng", 2012),
    ("Gregory University", "Uturu", "Abia", "https://www.gregoryuniversity.com", 2012),
    ("Mcpherson University", "Seriki Sotayo", "Ogun", "https://www.mcu.edu.ng", 2012),
    ("Southwestern University", "Oku Owa", "Ogun", "https://www.southwesternuniversity.edu.ng", 2012),
    ("Augustine University", "Ilara-Epe", "Lagos", "https://www.augustineuniversity.edu.ng", 2015),
    ("Chrisland University", "Abeokuta", "Ogun", "https://www.chrislanduniversity.edu.ng", 2015),
    ("Edwin Clark University", "Kiagbodo", "Delta", "https://www.edwinclarkuniversity.edu.ng", 2015),
    ("Hallmark University", "Ijebu Itele", "Ogun", "https://www.hallmark.edu.ng", 2015),
    ("Hezekiah University", "Umudi", "Imo", "https://hezekiah.edu.ng", 2015),
    ("Kings University", "Ode Omu", "Osun", "https://www.kingsuniversity.edu.ng", 2015),
    ("Michael and Cecilia Ibru University", "Agbara-Otor", "Delta", "https://mciu.edu.ng", 2015),
    ("Mountain Top University", "Makogi-Oba", "Ogun", "https://www.mtu.edu.ng", 2015),
    ("Ritman University", "Ikot Ekpene", "Akwa Ibom", "https://www.ritmanuniversity.edu.ng", 2015),
    ("Summit University", "Offa", "Kwara", "https://www.summituniversity.edu.ng", 2015),
    ("Christopher University", "Mowe", "Ogun", "https://www.christopheruniversity.edu.ng", 2015),
    ("Kola Daisi University", "Ibadan", "Oyo", "https://www.koladaisiuniversity.edu.ng", 2016),
    ("Anchor University", "Ayobo", "Lagos", "https://www.aul.edu.ng", 2016),
    ("Dominican University", "Ibadan", "Oyo", "https://www.dui.edu.ng", 2016),
    ("Legacy University", "Okija", "Anambra", "https://www.legacyuniversity.edu.ng", 2016),
    ("Arthur Jarvis University", "Akpabuyo", "Cross River", "https://www.arthurjarvisuniversity.edu.ng", 2016),
    ("Ojaja University", "Eiyenkorin", "Kwara", "https://www.crownhilluniversity.edu.ng", 2016),
    ("Coal City University", "Enugu", "Enugu", "https://www.ccu.edu.ng", 2016),
    ("Clifford University", "Owerrinta", "Abia", "https://www.clifforduni.edu.ng", 2016),
    ("Spiritan University", "Nneochi", "Abia", "https://www.spiritanuniversity.edu.ng", 2017),
    ("Precious Cornerstone University", "Oyo", "Oyo", "https://www.pcu.edu.ng", 2017),
    ("PAMO University of Medical Sciences", "Port Harcourt", "Rivers", "https://www.pums.edu.ng", 2017),
    ("Atiba University", "Oyo", "Oyo", None, 2017),
    # "Eko University of Medical and Health Sciences" removed: same
    # institution as the already-seeded "Eko University of Medicine and
    # Health Sciences" (Ijanikin, Lagos), a spelling variant only.
    ("Skyline University", "Kano", "Kano", "https://www.sun.edu.ng", 2018),
    ("Greenfield University", "Kaduna", "Kaduna", "https://www.gfu.edu.ng", 2019),
    ("Dominion University", "Ibadan", "Oyo", "https://www.dominionuniversity.edu.ng", 2019),
    ("Trinity University", "Ogun", "Ogun", "https://www.trinityuniversity.edu.ng", 2019),
    ("Westland University", "Iwo", "Osun", None, 2019),
    ("Topfaith University", "Mkpatak", "Akwa Ibom", None, 2021),
    ("Thomas Adewumi University", "Oko-Irese", "Kwara", "https://www.tau.edu.ng", 2021),
    ("Maranatha University", "Lagos", "Lagos", None, 2021),
    ("Ave Maria University", "Piyanko", "Nasarawa", None, 2021),
    ("Al-Istiqama University", "Sumaila", "Kano", None, 2021),
    ("Mudiame University", "Irrua", "Edo", None, 2021),
    ("Havilla University", "Nde-Ikom", "Cross River", "https://havillauniversity.edu.ng", 2021),
    ("Claretian University of Nigeria", "Nekede", "Imo", None, 2021),
    ("Karl-Kumm University", "Vom", "Plateau", None, 2021),
    ("James Hope University", "Lagos", "Lagos", "https://www.jhu.edu.ng", 2021),
    ("Maryam Abacha American University of Nigeria", "Kano", "Kano", "https://www.maaun.edu.ng", 2021),
    ("Capital City University", "Kano", "Kano", "https://www.ccuk.edu.ng", 2021),
    ("Ahman Pategi University", "Pategi", "Kwara", None, 2021),
    ("University of Offa", "Offa", "Kwara", None, 2021),
    ("Mewar International University", "Masaka", "Nasarawa", "https://www.miu.edu.ng", 2021),
    ("Edusoko University", "Bida", "Niger", None, 2021),
    ("Philomath University", "Kuje", "FCT", None, 2021),
    ("Anan University", "Kwall", "Plateau", None, 2021),
    ("North Eastern University", "Gombe", "Gombe", "https://pru.edu.ng", 2022),
    ("Al-Ansar University", "Maiduguri", "Borno", None, 2022),
    ("Margaret Lawrence University", "Umunede", "Delta", None, 2022),
    ("Khalifa Isiyaku Rabiu University", "Kano", "Kano", None, 2022),
    ("Sports University", "Idumuje-Ugboko", "Delta", None, 2022),
    ("Baba Ahmed University", "Kano", "Kano", None, 2022),
    ("Saisa University of Medical Sciences and Technology", "Sokoto", "Sokoto", None, 2022),
    ("Nigerian British University", "Asa", "Abia", "https://nbu.edu.ng", 2022),
    ("Peter University", "Achina-Onneh", "Anambra", None, 2022),
    ("Newgate University", "Minna", "Niger", None, 2022),
    ("European University of Nigeria", "Duboyi", "FCT", None, 2022),
    ("NorthWest University", "Sokoto", "Sokoto", "https://nwus.edu.ng", 2022),
    ("Rayhaan University", "Birnin Kebbi", "Kebbi", None, 2023),
    ("Muhammad Kamalud University", "Ilorin", "Kwara", None, 2023),
    ("Sam Maris University", "Supare", "Ondo", None, 2023),
    ("Aletheia University", "Ago-Iwoye", "Ogun", None, 2023),
    ("Lux Mundi University", "Umuahia", "Abia", None, 2023),
    ("Maduka University", "Ekwegbe", "Enugu", None, 2023),
    ("PeaceLand University", "Enugu", "Enugu", None, 2023),
    ("Amadeus University", "Amizi", "Abia", None, 2023),
    ("Vision University", "Ikogbo", "Ogun", None, 2023),
    ("Azman University", "Kano", "Kano", None, 2023),
    ("Huda University", "Gusau", "Zamfara", None, 2023),
    ("Franco British International University", "Kaduna", "Kaduna", "https://fbiu.edu.ng", 2023),
    ("Canadian University of Nigeria", "Abuja", "FCT", None, 2023),
    ("Gerar University of Medical Science", "Imope Ijebu", "Ogun", None, 2023),
    ("British Canadian University", "Obufu", "Cross River", None, 2023),
    ("Hensard University", "Toru-Orua", "Bayelsa", None, 2023),
    ("Amaj University", "Kwali", "FCT", None, 2023),
    ("Phoenix University", "Agwada", "Nasarawa", None, 2023),
    ("Wigwe University", "Isiokpo", "Rivers", "https://www.wigweuniversity.edu.ng", 2023),
    ("Hillside University of Science and Technology", "Okemisi", "Ekiti", "https://www.hust.edu.ng", 2023),
    ("University on the Niger", "Umunya", "Anambra", None, 2023),
    ("Elrazi Medical University", "Yargaya", "Kano", None, 2023),
    ("Venite University", "Iloro-Ekiti", "Ekiti", None, 2023),
    ("Shanahan University", "Onitsha", "Anambra", None, 2023),
    ("The Duke Medical University", "Calabar", "Cross River", None, 2023),
    ("Mercy Medical University", "Iwo", "Ogun", None, 2023),
    ("Cosmopolitan University", "Abuja", "FCT", None, 2023),
    ("Miva Open University", "Abuja", "FCT", "https://miva.university", 2023),
    ("Iconic Open University", "Sokoto", "Sokoto", None, 2023),
    ("West Midlands Open University", "Ibadan", "Oyo", None, 2023),
    ("Al-Muhibbah Open University", "Abuja", "FCT", None, 2023),
    ("El-Amin University", "Minna", "Niger", None, 2023),
    ("College of Petroleum and Energy Studies", "Kaduna", "Kaduna", None, 2023),
    ("Jewel University", "Gombe", "Gombe", None, 2023),
    ("Prime University", "Kuje", "FCT", None, 2023),
    ("Nigerian University of Technology and Management", "Apapa", "Lagos", None, 2023),
    ("Al-Bayan University", "Ankpa", "Kogi", None, 2023),
    ("Lighthouse University", "Evbobanosa", "Edo", None, 2024),
    ("African University of Economics", "Abuja", "FCT", None, 2024),
    ("New City University", "Ayetoro", "Ogun", None, 2025),
    ("University of Fortune", "Igbotako", "Ondo", None, 2025),
    ("Eranova University", "Abuja", "FCT", "https://eranova.edu.ng", 2025),
    ("Minaret University", "Ikirun", "Osun", None, 2025),
    ("Abdulrasaq Abubakar Toyin University", "Ganmo", "Kwara", None, 2025),
    ("Southern Atlantic University", "Uyo", "Akwa Ibom", None, 2025),
    ("Lens University", "Ilemona", "Kwara", None, 2025),
    ("Monarch University", "Iyesi-Ota", "Ogun", None, 2025),
    ("Tonine Iredia University of Communication", "Benin City", "Edo", None, 2025),
    ("Isaac Balami University of Aeronautics and Management", "Lagos", "Lagos", None, 2025),
    ("Kevin Eze University", "Mgbowo", "Enugu", None, 2025),
    ("Tazkiyah University", "Kaduna", "Kaduna", None, 2025),
    ("Leadership University", "Abuja", "FCT", None, 2025),
    ("Jimoh Babalola University", "Ilorin", "Kwara", None, 2025),
    ("Bridget University Mbaise", "Okirika-Nweke", "Imo", None, 2025),
    ("Greenland University", "Jalingo", "Taraba", None, 2025),
    ("JEFAP University", "Suleja", "Niger", None, 2025),
    ("Azione Verde University", "Amaigbo", "Imo", None, 2025),
    ("Unique Open University", "Ojo", "Lagos", None, 2025),
    ("American Open University", "Abeokuta", "Ogun", None, 2025),
]

# Supplemented from Wikipedia's "List of universities in Nigeria" state
# section (itself NUC-sourced), used because NUC's own dedicated state-
# university page could not be located at a stable URL in this session.
STATE = [
    ("Abdulkadir Kure University", "Minna", "Niger"),
    ("Abia State University", "Uturu", "Abia"),
    ("Abiola Ajimobi Technical University", "Ibadan", "Oyo"),
    ("Adamawa State University", "Mubi", "Adamawa"),
    ("Adekunle Ajasin University", "Akungba-Akoko", "Ondo"),
    ("Akwa Ibom State University", "Uyo", "Akwa Ibom"),
    ("Aliko Dangote University of Science and Technology", "Wudil", "Kano"),
    ("Ambrose Alli University", "Ekpoma", "Edo"),
    ("Bauchi State University", "Gadau", "Bauchi"),
    ("Bayelsa Medical University", "Yenagoa", "Bayelsa"),
    ("Benue State University", "Makurdi", "Benue"),
    ("Borno State University", "Maiduguri", "Borno"),
    ("Chukwuemeka Odumegwu Ojukwu University", "Uli", "Anambra"),
    ("Delta State University", "Abraka", "Delta"),
    ("Delta State University of Science and Technology", "Ozoro", "Delta"),
    ("Dennis Osadebay University", "Asaba", "Delta"),
    ("Ebonyi State University", "Abakaliki", "Ebonyi"),
    ("Edo State University, Uzairue", "Iyamho", "Edo"),
    ("Ekiti State University", "Ado Ekiti", "Ekiti"),
    ("Emmanuel Ayande University of Education", "Oyo", "Oyo"),
    ("Enugu State University of Science and Technology", "Enugu", "Enugu"),
    ("Gombe State University", "Gombe", "Gombe"),
    ("Gombe State University of Science and Technology", "Kumo", "Gombe"),
    ("Ibrahim Badamasi Babangida University", "Lapai", "Niger"),
    ("Ignatius Ajuru University of Education", "Port Harcourt", "Rivers"),
    ("Imo State University", "Owerri", "Imo"),
    ("Kaduna State University", "Kaduna", "Kaduna"),
    ("Kebbi State University of Science and Technology", "Aliero", "Kebbi"),
    ("Kingsley Ozumba Mbadiwe University", "Ideato South", "Imo"),
    ("Kwara State University", "Malete", "Kwara"),
    ("Prince Abubakar Audu University", "Anyigba", "Kogi"),
    ("Ladoke Akintola University of Technology", "Ogbomoso", "Oyo"),
    ("Lagos State University", "Ojo", "Lagos"),
    ("Lagos State University of Education", "Ijanikin", "Lagos"),
    ("Lagos State University of Science and Technology", "Ikorodu", "Lagos"),
    ("Nasarawa State University", "Keffi", "Nasarawa"),
    ("Niger Delta University", "Amassoma", "Bayelsa"),
    ("Olabisi Onabanjo University", "Ago-Iwoye", "Ogun"),
    ("Olusegun Agagu University of Science and Technology", "Okitipupa", "Ondo"),
    ("Osun State University", "Osogbo", "Osun"),
    ("Plateau State University", "Bokkos", "Plateau"),
    ("Rivers State University", "Port Harcourt", "Rivers"),
    ("Sule Lamido University", "Kafin-Hausa", "Jigawa"),
    ("Taraba State University", "Jalingo", "Taraba"),
    ("Umaru Musa Yar'adua University", "Katsina", "Katsina"),
    ("University of Cross River State", "Calabar", "Cross River"),
    ("Sokoto State University", "Sokoto", "Sokoto"),
    ("University of Delta", "Agbor", "Delta"),
    ("Yobe State University", "Damaturu", "Yobe"),
    ("Yusuf Maitama Sule University Kano", "Kano", "Kano"),
    ("Zamfara State University", "Talata Mafara", "Zamfara"),
    # Additional state universities referenced in NUC news/press coverage
    # but not present in the Wikipedia table at fetch time.
    ("Imo State University of Innovation, Science and Technology", "Moma", "Imo"),
]


def build_roster():
    roster = []
    for name, city, state, website, year in FEDERAL:
        roster.append({
            "name": name, "type": "federal", "state": state, "city": city,
            "website": website, "established_year": year,
        })
    for name, city, state, website, year in PRIVATE:
        roster.append({
            "name": name, "type": "private", "state": state, "city": city,
            "website": website, "established_year": year,
        })
    for name, city, state in STATE:
        roster.append({
            "name": name, "type": "state", "state": state, "city": city,
            "website": None, "established_year": None,
        })
    return roster


if __name__ == '__main__':
    roster = build_roster()
    federal = sum(1 for r in roster if r["type"] == "federal")
    state = sum(1 for r in roster if r["type"] == "state")
    private = sum(1 for r in roster if r["type"] == "private")
    with_site = sum(1 for r in roster if r.get("website"))
    print(f"federal: {federal}")
    print(f"state  : {state}")
    print(f"private: {private}")
    print(f"total  : {len(roster)}")
    print(f"with website: {with_site} / {len(roster)}")
