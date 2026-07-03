"""
NZSL Cultural Foundation — Cultural Seed Data
==============================================
Fills the database with rich Sri Lankan cultural content.
Run once after setting up the database.

Usage:
  python scripts/seed_cultural.py

Requires DATABASE_URL (or PG* vars) in .env or environment.
"""

import os
import sys
import uuid
from pathlib import Path
from datetime import date, datetime

_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    print("[ERROR] psycopg not installed. Run:  pip install psycopg[binary]")
    sys.exit(1)

DB_URL = os.environ.get("DATABASE_URL", "")

def _conninfo():
    if DB_URL:
        return DB_URL
    parts = []
    for k, env in [("host","PGHOST"),("port","PGPORT"),("dbname","PGDATABASE"),
                   ("user","PGUSER"),("password","PGPASSWORD")]:
        v = os.environ.get(env)
        if v: parts.append(f"{k}={v}")
    return " ".join(parts) or "host=127.0.0.1 port=5432"

def q(sql, params=None):
    with psycopg.connect(_conninfo(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if cur.description:
                return cur.fetchall()
        conn.commit()
    return []

def ex(sql, params=None):
    with psycopg.connect(_conninfo()) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
        conn.commit()

def get_or_create_admin() -> str:
    rows = q("SELECT id FROM admins LIMIT 1")
    if rows:
        return str(rows[0]["id"])
    aid = str(uuid.uuid4())
    import bcrypt
    pw = bcrypt.hashpw(b"SeedAdmin123!", bcrypt.gensalt(12)).decode()
    ex("INSERT INTO admins (id,email,name,password_hash,role) VALUES (%s,%s,%s,%s,%s)",
       [aid, "seed@nzslfoundation.org.nz", "Seed Admin", pw, "admin"])
    return aid

# ===========================================================================
# DATA
# ===========================================================================

EVENTS = [
    {
        "title": "Vesak Lantern Festival 2026",
        "description": "Join us for a magical evening of Vesak lanterns, traditional music and Buddhist reflections as we celebrate the birth, enlightenment and passing of the Gautama Buddha.",
        "full_description": """The Vesak Lantern Festival is one of the most sacred and visually spectacular events in the Sri Lankan calendar. On the full moon of May, thousands of hand-crafted lanterns illuminate the night sky in a breathtaking display that symbolises the light of the Dhamma dispersing the darkness of ignorance.

Our Wellington celebration brings together families from across Aotearoa New Zealand for an evening that combines reverence with joy. Artisans from our community will display and sell traditional Vesak lanterns handmade from tissue paper and bamboo — skills passed down through generations.

The evening programme includes:
• Traditional Bodhi Puja ceremony at sunset
• Kandyan drumming and torch-lighting procession
• Community lantern release over the harbour
• Sri Lankan vegetarian feast
• Cultural storytelling for children

All are welcome regardless of faith or background. Come experience a piece of Sri Lanka's most beloved festival in the heart of Aotearoa.""",
        "date": "2026-05-10",
        "time_start": "17:30",
        "time_end": "22:00",
        "location": "Wellington Waterfront, Frank Kitts Park",
        "category": "festival",
        "featured": True,
    },
    {
        "title": "Sinhala & Tamil New Year Celebrations — Avurudu 2026",
        "description": "Welcome the traditional New Year with games, feasts, rituals and the warmth of community. Celebrate Avurudu the traditional way with our vibrant cultural festival.",
        "full_description": """Avurudu — the Sinhala and Tamil New Year — is the most joyous celebration in the Sri Lankan cultural calendar. It marks the end of the harvest season and the commencement of a new astrological year, observed with ancient customs that connect us to thousands of years of heritage.

Our 2026 Avurudu Festival will transform Auckland's Aotea Square into a vibrant Sri Lankan village for a full day. Expect the sights, sounds and aromas of the island — from freshly fried kokis and kavum to the thundering rhythm of the rabana drum.

Highlights include:
• Auspicious lighting of the hearth ceremony (Litha)
• Traditional Avurudu games — pillow fighting, lime-and-spoon race, kotta pora
• Kavum and kokis making demonstrations
• Rabana drumming workshops for all ages
• Traditional oil-anointing and betel ceremony
• Live Baila music and dancing
• Prizes and giveaways for traditional dress

This event celebrates both Sinhala and Tamil heritage — a day of unity that reflects our community's rich diversity.""",
        "date": "2026-04-18",
        "time_start": "10:00",
        "time_end": "19:00",
        "location": "Aotea Square, Auckland City Centre",
        "category": "festival",
        "featured": True,
    },
    {
        "title": "Kandyan Dance & Drum Masterclass",
        "description": "A rare opportunity to learn the foundations of Sri Lanka's classical Kandyan dance and the iconic low-country drum (yak beraya) from master performers.",
        "full_description": """Kandyan dance — Udarata Natum — is Sri Lanka's most celebrated classical dance tradition. Originating in the hill country of Kandy, it is characterised by elaborate costumes, precise footwork, rhythmic drum accompaniment, and gestures steeped in ritual significance.

This two-day masterclass is led by Guru Nishantha Perera, a recipient of the National Kala Keerthi Award and a keeper of the Ves dance lineage. Students will learn:

Day 1 — Foundations:
• History and spiritual context of Kandyan dance
• Basic stance, arm positions and footwork patterns
• Introduction to the five mask dances (Kohomba Kankariya)

Day 2 — Rhythm & Integration:
• Yak beraya drumming patterns with Guru Pradeep Samarawickrama
• Combining dance with live drum accompaniment
• Short performance piece to share with family at the close

Open to ages 12 and above. No prior dance experience required. Costumes available to borrow for the final performance.""",
        "date": "2026-07-25",
        "time_start": "09:30",
        "time_end": "17:00",
        "location": "Wellington Performing Arts Centre, Te Aro",
        "category": "workshop",
        "featured": True,
    },
    {
        "title": "Poson Full Moon Cultural Evening",
        "description": "Commemorate the arrival of Buddhism in Sri Lanka with a serene evening of dharma talks, traditional music and community sharing.",
        "full_description": """Poson Poya marks the arrival of Mahinda Thero in Sri Lanka in the 3rd century BCE — a moment that transformed the island's spiritual and cultural identity forever. It is the second most sacred day in the Theravada Buddhist calendar and is observed with pilgrimages, lantern displays and dana (charitable giving).

Our community Poson evening is a gentle, reflective celebration. Unlike the exuberance of Vesak or Avurudu, Poson invites us to pause, connect and share.

Programme:
• Dhamma talk by Venerable Sumedha Thero (Wellington Buddhist Vihara)
• Traditional pirith chanting and merit-making
• Cultural performances: flute, sithar and traditional singing
• Community dana — a shared vegetarian meal prepared by volunteers
• Poson lantern walk through the botanical gardens
• Photography exhibition: Sacred Sites of Sri Lanka

All donations from the evening support our youth heritage scholarship programme.""",
        "date": "2026-06-03",
        "time_start": "18:00",
        "time_end": "21:30",
        "location": "Wellington Botanical Garden, Centennial Lawn",
        "category": "cultural",
        "featured": False,
    },
    {
        "title": "Sri Lankan Batik Art Workshop",
        "description": "Learn the ancient wax-resist dyeing art of batik — a treasured Sri Lankan craft tradition — in this hands-on workshop for all skill levels.",
        "full_description": """Batik is one of Sri Lanka's most distinctive art forms — a wax-resist fabric dyeing technique that produces breathtaking patterns inspired by nature, geometry and mythology. While batik exists across Asia, the Sri Lankan tradition has its own bold character: vivid tropical colours, flowing motifs, and a spontaneity that reflects the island's artistic soul.

In this full-day workshop, you will:
• Learn the history of Sri Lankan batik and its coastal trade origins
• Practise tjanting (hot wax drawing) techniques on fabric
• Apply natural and synthetic dyes to build layered colour compositions
• Create a finished A3-sized batik panel to take home
• Receive a mini batik kit to continue at home

Led by Nimali Fernando, a textile artist trained at the University of Moratuwa whose work has been exhibited across New Zealand and Sri Lanka. All materials provided. Wear clothes you don't mind getting dye on!""",
        "date": "2026-08-15",
        "time_start": "10:00",
        "time_end": "16:30",
        "location": "Toi Pōneke Arts Centre, Wellington",
        "category": "workshop",
        "featured": False,
    },
    {
        "title": "NZSL Cultural Gala Night 2026 — The Golden Isle",
        "description": "Our flagship annual gala returns — an evening of fine Sri Lankan cuisine, classical and contemporary performances, and community celebration.",
        "full_description": """The NZSL Cultural Gala is the crown jewel of our annual calendar — an evening that brings together hundreds of community members, dignitaries, and friends of Sri Lanka for a night of cultural richness, culinary excellence and joyful belonging.

This year's theme, The Golden Isle, celebrates the enduring brilliance of Sri Lankan civilisation — from the ancient hydraulic kingdoms of Anuradhapura and Polonnaruwa to the spice trade that brought Lanka's name to every corner of the world.

Gala programme:
• Red carpet arrival and cocktail reception (6:00 pm)
• Welcome by the NZ High Commissioner and Sri Lankan Ambassador
• Cultural showcase: Kandyan dance, Bharatanatyam, classical flute
• Traditional Sri Lankan banquet — five-course feast by Serendib Catering
• Contemporary music: fusion of Baila and modern Sri Lankan sounds
• Community awards — honouring outstanding members
• Charity auction supporting our youth heritage bursary

Formal or national dress. Black-tie optional. Limited tickets — book early.""",
        "date": "2026-09-19",
        "time_start": "18:00",
        "time_end": "23:00",
        "location": "Te Papa Museum, Waterfront Wellington",
        "category": "cultural",
        "featured": True,
    },
    {
        "title": "Heritage Language Classes — Sinhala for Beginners",
        "description": "A six-week introduction to the Sinhala language for second-generation Sri Lankans and anyone curious about this ancient and beautiful tongue.",
        "full_description": """Sinhala (ස්ිංහල) is one of the world's oldest continuously spoken languages, with a literary tradition stretching back more than 2,000 years. For many second-generation Sri Lankans in New Zealand, learning Sinhala is an act of cultural reclamation — a way to speak with grandparents, read sacred texts, and feel more fully at home in their heritage.

Our beginner programme runs over six consecutive Saturday mornings and covers:
• The Sinhala script — vowels and consonants
• Everyday greetings, numbers, colours and family terms
• Basic conversational phrases for home and community life
• Cultural context: proverbs, folk songs and their meanings
• Simple reading practice with devanagari script cards

Taught by Chamari Silva, a qualified language teacher with a Master's in Applied Linguistics from Victoria University of Wellington. Classes are warm, patient and community-focused — no pressure, just joy in learning.""",
        "date": "2026-10-03",
        "time_start": "09:30",
        "time_end": "11:30",
        "location": "Newtown Community Centre, Wellington",
        "category": "workshop",
        "featured": False,
    },
    {
        "title": "Deepavali — Festival of Lights Celebration",
        "description": "Celebrate the Tamil New Year's festival of lights with the Tamil community of Aotearoa. Light diyas, enjoy sweets, and share in the joy of Deepavali.",
        "full_description": """Deepavali — the Festival of Lights — is one of the most beloved celebrations in the Tamil calendar, marking the victory of light over darkness and knowledge over ignorance. The NZSL Cultural Foundation is proud to co-host Deepavali with the New Zealand Tamil Society in a spirit of unity that honours the shared cultural heritage of all Sri Lankans.

The evening will transform our venue into a constellation of oil lamps (diyas), marigold garlands and rangoli art.

Programme:
• Diya lighting ceremony and prayer
• Traditional kolam (rangoli) competition — all ages welcome
• Bharatanatyam and Kollattam folk dance performances
• Tamil classical music: veena and mridangam
• Sweets table: Deepavali mithai, murukku, laddu, payasam
• Firecrackers display (fireworks-safe alternatives for children)

We welcome all communities to join us in celebrating the richness of Tamil culture and its vibrant presence in Aotearoa New Zealand.""",
        "date": "2026-10-20",
        "time_start": "17:00",
        "time_end": "21:30",
        "location": "ASB Waterfront Theatre Foyer, Auckland",
        "category": "festival",
        "featured": False,
    },
]

STORIES = [
    {
        "title": "The Living Art of Kandyan Dance: Five Centuries of Grace",
        "excerpt": "How a royal ritual from the Kandyan kingdom became Sri Lanka's most iconic classical dance — and how our community keeps it alive in Aotearoa.",
        "content": """Long before the curtain of any theatre was invented, Kandyan dance unfolded in the firelit courtyards of the Dalada Maligawa — the Temple of the Sacred Tooth Relic in Kandy. Dancers moved in full ceremonial regalia: silver chest plates, towering headdresses adorned with silver coins, and elaborately embroidered belts that caught the torchlight as they spun.

The dance was not entertainment. It was ritual. The ves costume — the full ceremonial dress of a Kandyan dancer — could only be worn after an elaborate initiation ceremony (ves bandeema) that bound the dancer to a life of devotion to the tradition. To this day, no dancer wears the ves lightly.

**The Five Traditions**

Kandyan dance encompasses five distinct regional styles: Udarata (hill country), Pahatharata (low country), Sabaragamuwa, Uda Rakitha and Pahatha Rakitha. Each has its own footwork, costumes and spiritual associations. What unifies them is the extraordinary athleticism — the spinning jumps (uthul gaseema), the chest-drumming gestures, the precise communication of emotion through hand positions (mudras) that borrow from both Buddhist iconography and Dravidian dance theory.

**In Aotearoa**

When the first wave of Sri Lankan immigrants arrived in New Zealand in the 1970s and 80s, they brought this dance with them — mothers teaching daughters in living rooms, fathers drumming on makeshift tablas, grandparents correcting footwork from memory of performances seen decades before.

Today, the NZSL Cultural Foundation runs the only formally structured Kandyan dance programme in the Wellington region. Our students range from five-year-olds taking their first unsure steps in tiny ankle bells to adults in their forties who are reclaiming a heritage that globalisation threatened to dissolve.

"When I dance," says Kavindra, 16, born in Wellington, third-generation Sri Lankan, "I feel like I'm a thread in something very long. Like the dance is older than anyone can remember and I'm just the newest part of it."

That continuity — that thread across centuries and oceans — is exactly what the foundation exists to protect.""",
        "author": "Dilini Amarasinghe",
        "category": "culture",
        "read_time": 7,
    },
    {
        "title": "From Colombo to Wellington: Stories of the First Generation",
        "excerpt": "Four Sri Lankans who came to New Zealand in the 1970s and 80s reflect on building a life between two cultures, and what they hope to leave behind.",
        "content": """They came with degrees and suitcases, with recipes memorised and nothing written down, with accents that were immediately noticeable in a country where Sri Lanka was, for most people, barely a name on a map.

**Soma Wickramasinghe, arrived 1974**

"I was 27. I had a job offer from the government — they needed engineers. I thought I'd stay three years. It's been fifty."

Soma arrived in Wellington in July, in the middle of a southerly that felt, he says, like a physical rebuke. He found a flat in Newtown, started at the Ministry of Works, and spent his first six months in a fog of politeness and longing.

"There was no community then. No temple. I used to cook dal on a two-ring burner and listen to Radio Ceylon shortwave if the signal was good."

What Soma built in the decades that followed — a family, a professional career, and eventually a founding role in what became the NZSL Cultural Foundation — reflects something that recurs in every first-generation story: the imperative to create what doesn't yet exist.

**Anoja Perera, arrived 1981**

Anoja came as a student to study nursing, married a Sri Lankan she met at the University of Otago, and stayed. She remembers the particular loneliness of cultural isolation — not the grinding poverty loneliness, but the subtler kind.

"You could go weeks without speaking Sinhala. Without eating rice properly. Without someone who understood a joke the same way."

She started a small cooking circle — six women, a shared pot, rotating houses. Within five years it had become the Cultural Association, fifty members, and the seeds of something that would outlast all of them.

**The Thread That Holds**

What each of these voices shares is an intuition that culture is not decorative. It is the medium through which people know themselves. In building institutions — temples, cultural associations, language classes, dance schools — the first generation was not indulging nostalgia. They were building infrastructure. They were laying the foundations on which their grandchildren could know who they are.

The NZSL Cultural Foundation is their grandchildren's inheritance.""",
        "author": "Thushara Mendis",
        "category": "heritage",
        "read_time": 9,
    },
    {
        "title": "The Science of Sri Lankan Spice: A Culinary Heritage",
        "excerpt": "Sri Lankan cuisine is one of the most complex spice traditions in the world. Understanding it means understanding the island's history of trade, conquest and reinvention.",
        "content": """The spice rack of a Sri Lankan kitchen is not a row of jars. It is a library.

There are the obvious stars — cinnamon (the real Ceylon kind, paper-thin and sweet, nothing like the hard cassia sticks sold in supermarkets), cardamom, cloves, nutmeg. There are the supporting cast of dried chilies in three different heat registers, fenugreek seeds that bitter and bloom when toasted, curry leaf that smells like nothing else on earth.

And then there are the transformative combinations: the roasted curry powder (black with the deep char of toasted coriander and fennel), the raw curry powder (bright with turmeric), the Jaffna-style powder that crackles with dried red chili.

**A History in Flavour**

Sri Lanka sits at the centre of one of history's great trade crossroads. Arab traders, Portuguese colonists, Dutch merchants, British administrators — each wave of arrival left a culinary fingerprint. The Portuguese brought tomatoes and chili. The Dutch brought Dutch love apples and a taste for vinegared preparations. The British brought Worcestershire sauce (which is why you still find it in Sri Lankan pantries to this day).

But the foundation was always older and deeper: the Ayurvedic understanding of food as medicine, the Buddhist influence that shaped temple cuisine, the Tamil and Sinhalese traditions that coexisted and cross-pollinated across the island for two millennia.

**Making It Here**

In New Zealand, Sri Lankan home cooks face a particular challenge: many of the key ingredients — fresh pandan leaf, rampe, goraka (gamboge), fresh green chilies of the right variety — are either unavailable or expensive and wilted by the time they reach the shop.

"You adapt," says Kumari Jayawardena, who has been cooking Sri Lankan food in Wellington for 35 years. "You find substitutions. You grow things in pots. You learn which Indian shops carry the closest thing. And sometimes you just make do and it's still wonderful."

What doesn't adapt, what cannot be substituted, is the knowledge of technique: the two-stage frying of mustard seeds, the way coconut milk is added in stages to prevent splitting, the patience required for a proper black pork curry that needs four hours.

That knowledge lives in people. Which is why the foundation's culinary heritage programme matters: not just for the eating, but for everything the cooking carries with it.""",
        "author": "Priyanka de Silva",
        "category": "culture",
        "read_time": 8,
    },
    {
        "title": "Vesak in Wellington: When the Waterfront Glows",
        "excerpt": "A photographic and personal account of our annual Vesak Lantern Festival — and what it means to mark a sacred day 11,000 kilometres from home.",
        "content": """The first time I saw a Vesak lantern in Wellington, I cried.

I was twenty-three, in my second year here, still homesick in the way that ambushes you in the supermarket when you see a brand you recognise from home. It was evening, the harbour was dark and choppy, and someone had strung a single paper lantern between two poles near the waterfront. It glowed orange and gold and swayed in the southerly, and it was so completely, quietly perfect that I sat down on a bench and wept.

**The History of Vesak Illumination**

In Sri Lanka, Vesak (the full moon of May) transforms the island. Every house, temple, roadside shrine and shopping mall blazes with lanterns and torana — elaborate illuminated structures made from bamboo, tissue paper and electric lights that can rise fifteen metres high. The streets become rivers of light. The sound is of generators and radios and the soft percussion of children being nudged to prayers.

The tradition of Vesak lanterns (vesak kudu) is deeply democratic: every family makes their own. The lanterns can be simple — a bamboo frame, coloured paper, a candle — or extraordinary, intricate architectural models that take weeks to construct.

**What Wellington Has Built**

What started twelve years ago as a small gathering of Sri Lankan families on the Wellington waterfront has grown into one of the most anticipated cultural events in the city's calendar. Last year, over 800 people attended, including the Mayor, the Sri Lankan High Commissioner, and hundreds of New Zealanders who had never encountered the tradition before.

The lanterns still matter most. Every year, families arrive with their creations — some modest and wobbly, some breathtaking, some clearly made by a seven-year-old with very ambitious vision and a limited supply of tape. They hang in the harbour wind and they glow, and for the few hours of the festival, Wellington feels, briefly, like Colombo.

Not identical. Not a replica. Something new and its own: a Sri Lankan tradition that has found a second home, and taken root in different soil, and flowered into something that belongs here too.""",
        "author": "Nadeeka Rathnayake",
        "category": "community",
        "read_time": 6,
    },
    {
        "title": "Growing Up Between Two Cultures: A Second Generation Perspective",
        "excerpt": "Three young Sri Lankan New Zealanders share what it means to be from here and from there — and how they're finding a language for both.",
        "content": """Roshani is 19, born in Christchurch, and has never been to Sri Lanka. She speaks Sinhala with her grandparents — imperfectly, she says, but getting better — and feels something complicated when people ask where she's from.

"I say New Zealand first. Because I am. But then they always say 'no, where are you really from?' And I don't quite know what to do with that."

This is a common story in our community. The second generation grew up in schools where their names were mispronounced, their food was unfamiliar, their religious calendar was invisible. They also grew up going to temple on Vesak, listening to their parents' music, eating rice and curry for every dinner, and absorbing, almost by osmosis, the textures of a culture they had never lived in geographically.

**The Hyphen and What It Holds**

Chaminda, 22, uses the word "hyphenated" with a kind of affectionate precision. "I'm Sri Lankan-New Zealander," he says. "Both are real. Neither cancels the other."

He learned Kandyan dance at the foundation from the age of eight. He performed at the Gala last year in full ves regalia. He is also a first-fifteen rugby player for his club and a machine learning student at Victoria University.

"I don't think those things are in tension," he says. "I think they're just what I am."

**What the Foundation Offers**

For many in the second generation, the Cultural Foundation has been the place where both halves of their identity could exist simultaneously — where they didn't have to choose.

"There's no explaining required," says Roshani. "Everyone already knows what Avurudu means. Everyone already knows why the full moon matters. You can just be."

That ease — that freedom from constant translation — is, perhaps, the most important thing any cultural institution can offer.""",
        "author": "Chaminda Gunawardena",
        "category": "community",
        "read_time": 7,
    },
]

NEWS = [
    {
        "title": "Foundation Receives Cultural Heritage Grant from Creative New Zealand",
        "summary": "The NZSL Cultural Foundation has been awarded a $45,000 Cultural Heritage grant to expand our youth dance programme and digitise our archive of Sri Lankan cultural materials.",
        "content": """We are thrilled to announce that the NZSL Cultural Foundation has been awarded a Cultural Heritage Grant of $45,000 by Creative New Zealand — the country's arts development agency.

The grant will fund two major initiatives over the next eighteen months:

**1. Youth Heritage Dance Programme Expansion**

We will expand our Kandyan dance and Bharatanatyam classes from one location to three, adding programmes in Auckland (Onehunga Community Centre) and Christchurch (South Christchurch Arts Centre). This expansion will allow us to reach an estimated 80 additional young people who currently have no access to structured traditional dance instruction.

New equipment — drums, costumes, and a professional sound system — will be purchased to support the expanded programme.

**2. Digital Heritage Archive**

Working with the Alexander Turnbull Library, we will digitise and catalogue our collection of over 3,000 photographs, documents and recordings dating from the 1960s to the present. This material includes rare documentation of early Sri Lankan community life in New Zealand, oral history recordings, and footage of cultural performances that would otherwise be lost to time.

The digitised archive will be made freely available to researchers, community members and the public through the National Library's DigitalNZ platform.

Foundation chair Ranjit Perera said: "This grant recognises the value of what our community has built over decades, and it gives us the resources to build on that foundation and reach a new generation. We are deeply grateful to Creative New Zealand."

Applications for places in the expanded dance programme will open in September 2025.""",
        "category": "news",
        "author": "NZSL Cultural Foundation",
    },
    {
        "title": "New Partnership with the Sri Lanka High Commission",
        "summary": "The foundation has signed a memorandum of understanding with the Sri Lanka High Commission in Wellington, formalising our partnership in cultural programming and community support.",
        "content": """The NZSL Cultural Foundation and the Sri Lanka High Commission in Wellington have signed a Memorandum of Understanding (MoU) formalising our longstanding partnership.

The MoU establishes a framework for:
• Joint cultural programming for national days and significant events
• Information sharing to support community members navigating documentation and services
• Collaborative promotion of Sri Lankan cultural events across New Zealand
• Youth exchange and scholarship opportunities

Sri Lankan High Commissioner H.E. Milinda Moragoda said at the signing ceremony: "Sri Lanka is deeply proud of its diaspora community in New Zealand. The NZSL Cultural Foundation has done extraordinary work to keep our heritage alive and thriving in this beautiful country, and we are honoured to formalise our partnership."

Foundation chair Ranjit Perera added: "This MoU gives us a formal channel to work together with the High Commission on issues that matter to our community. It's a recognition of the foundation's standing and the strength of the Sri Lankan community in Aotearoa."

The signing was attended by community leaders from Auckland, Wellington and Christchurch.""",
        "category": "news",
        "author": "NZSL Cultural Foundation",
    },
    {
        "title": "Avurudu 2025 — A Record-Breaking Celebration",
        "summary": "Our 2025 Avurudu Festival drew over 1,200 attendees — making it the largest Sri Lankan cultural event ever held in New Zealand. Here's a look back at an unforgettable day.",
        "content": """The numbers tell part of the story: 1,247 registered attendees. 38 volunteer helpers. 14 traditional Avurudu games. 400 metres of string hoppers. 200 coconut sambol servings. 6 litres of treacle consumed in kavum-making demonstrations.

But the numbers miss the best parts.

They miss the look on the face of a five-year-old girl from Dunedin — the only Sri Lankan family in her school — when she sees 1,200 people who look like her parents and eat the food she eats at home. They miss the teenage boy from Hutt Valley who wins the lime-and-spoon race and pumps his fist like he's just scored a try at Eden Park. They miss the 82-year-old grandmother in a white sari who sits and watches the drumming with her eyes closed and a very private smile.

Our 2025 Avurudu Festival, held at Aotea Square in Auckland on 12 April, was the largest Sri Lankan cultural event ever held in Aotearoa New Zealand. Attendees came from as far as Invercargill and Whangarei.

The traditional programme ran from 10am: the auspicious dawn ceremonies, the kindling of the new-year hearth fire, the exchanging of betel leaves, the anointing with herbal oils. Then the games — chaotic, competitive, shrieking with laughter — and then the feast.

We are already planning 2026. It will be bigger. Come and be part of it.""",
        "category": "news",
        "author": "Events Team",
    },
    {
        "title": "Introducing Our New Youth Heritage Scholarship",
        "summary": "Applications are now open for the inaugural NZSL Cultural Foundation Youth Heritage Scholarship — $2,000 awards to support young Sri Lankan New Zealanders in cultural arts and studies.",
        "content": """We are proud to launch the inaugural NZSL Cultural Foundation Youth Heritage Scholarship — a programme designed to support young Sri Lankan New Zealanders who are actively engaged in preserving and promoting Sri Lankan cultural heritage.

**About the Scholarship**

Five scholarships of $2,000 each will be awarded to applicants aged 15–25 who demonstrate:
• Active engagement in Sri Lankan cultural arts (dance, music, visual arts, literature)
• A commitment to sharing or teaching aspects of Sri Lankan heritage in their communities
• Academic achievement or vocational progress
• A personal statement connecting their cultural identity to their future goals

Scholarships may be used for cultural education (dance or music training, language study), tertiary fees, creative projects, or cultural travel.

**How to Apply**

Applications open 1 July 2026 and close 31 August 2026. The application requires:
• A 500-word personal statement
• Two references (one community, one academic or professional)
• Evidence of cultural engagement (photos, videos, letters from tutors welcome)

Applications are reviewed by a panel of community elders, educators, and arts practitioners. Results will be announced at our Annual Gala in September.

For application forms and guidelines, contact scholarship@nzslfoundation.org.nz or visit our community Facebook page.""",
        "category": "news",
        "author": "NZSL Cultural Foundation",
    },
]

GALLERY = [
    {"title": "Vesak Lantern Procession — Wellington Waterfront 2025", "category": "events", "description": "Hundreds of handmade Vesak lanterns lighting up the Wellington waterfront during our annual Vesak Poya celebration."},
    {"title": "Kandyan Dancers at Annual Gala 2025", "category": "performances", "description": "Traditional Kandyan dance performance in full ves regalia at the NZSL Cultural Gala at Te Papa Museum."},
    {"title": "Avurudu Games — Lime and Spoon Race", "category": "events", "description": "Community members of all ages competing in traditional Avurudu games at Aotea Square, Auckland."},
    {"title": "Batik Art Workshop — In Progress", "category": "workshops", "description": "Participants learning the art of traditional Sri Lankan batik with hot wax and natural dyes."},
    {"title": "Traditional Sri Lankan Food Spread — Avurudu Feast", "category": "culture", "description": "A full Avurudu feast spread: kavum, kokis, string hoppers, pol sambol, kiribath and more."},
    {"title": "Youth Dance Students — First Recital", "category": "performances", "description": "Young students from our heritage dance programme performing at their inaugural public recital."},
    {"title": "Rabana Drumming Circle — Community Workshop", "category": "workshops", "description": "Community women gathering for a traditional rabana drumming session — a practice tied to harvest celebrations."},
    {"title": "Poson Lantern Walk — Wellington Botanical Garden", "category": "events", "description": "The peaceful annual Poson lantern walk through the glittering pathways of Wellington's Botanical Garden."},
    {"title": "Foundation Leadership Dinner 2025", "category": "community", "description": "Foundation board members and community leaders at the annual leadership dinner."},
    {"title": "Sri Lankan Flags at ANZAC Day March", "category": "community", "description": "NZSL Cultural Foundation members proudly carrying the Sri Lankan flag at the Wellington ANZAC Day parade."},
    {"title": "Heritage Cooking Class — Curry Making", "category": "culture", "description": "Participants learning to make an authentic Sri Lankan black curry during a heritage cooking session."},
    {"title": "Bharatanatyam Performance — Wellington Arts Festival", "category": "performances", "description": "A mesmerising Bharatanatyam performance by our dance troupe at the Wellington Arts Festival fringe programme."},
    {"title": "Deepavali Kolam (Rangoli) Competition 2025", "category": "events", "description": "Beautiful kolam designs created by community members during our Deepavali celebration."},
    {"title": "Community Picnic — Sri Lankan Independence Day 2025", "category": "community", "description": "Families gathered at the Wellington Botanic Garden to celebrate Sri Lankan Independence Day."},
    {"title": "Traditional Sinhala Calligraphy Workshop", "category": "workshops", "description": "Learning the elegant curves of the Sinhala script in our monthly heritage language and arts programme."},
]

LEADERSHIP = [
    {"name": "Ranjit Perera", "role": "Chairperson", "bio": "Ranjit has led the foundation since 2019. A former diplomat with the Sri Lankan foreign service, he brings decades of experience in cultural diplomacy and community governance.", "order": 1},
    {"name": "Dr. Shamali Fernando", "role": "Vice Chairperson", "bio": "Dr. Fernando is a historian specialising in Sri Lankan diaspora studies at Victoria University of Wellington. She leads our heritage documentation and oral history programmes.", "order": 2},
    {"name": "Kumari Jayawardena", "role": "Secretary", "bio": "Kumari joined the foundation in 2016 and has been instrumental in growing our membership and managing our annual events calendar. She is a qualified accountant and runs a local business consultancy.", "order": 3},
    {"name": "Roshan de Mel", "role": "Treasurer", "bio": "A chartered accountant with 20 years of experience in the non-profit sector, Roshan ensures the foundation's financial stewardship meets the highest standards.", "order": 4},
    {"name": "Nimali Fernando", "role": "Arts & Culture Director", "bio": "A textile artist and art educator, Nimali oversees our visual arts programming including the batik workshops, heritage craft series and our cultural gallery.", "order": 5},
    {"name": "Priyanka de Silva", "role": "Events Coordinator", "bio": "Priyanka has coordinated over 30 major community events since joining the foundation in 2020. She is the creative force behind our annual Avurudu Festival and Gala Night.", "order": 6},
    {"name": "Guru Nishantha Perera", "role": "Dance Programme Lead", "bio": "A Kala Keerthi Award recipient and lineage holder of the Ves Kandyan dance tradition, Guru Nishantha leads all dance programming and training at the foundation.", "order": 7},
    {"name": "Chamari Silva", "role": "Heritage Language Lead", "bio": "A qualified linguist and teacher, Chamari runs our Sinhala language classes and is developing Tamil heritage programmes in collaboration with the NZ Tamil Society.", "order": 8},
]

# ===========================================================================
# SEED FUNCTIONS
# ===========================================================================

def seed_events(admin_id: str):
    print("\n📅  Seeding events...")
    for ev in EVENTS:
        existing = q("SELECT id FROM events WHERE title = %s", [ev["title"]])
        if existing:
            print(f"  skip (exists): {ev['title'][:50]}")
            continue
        ex(
            "INSERT INTO events (title,description,full_description,date,time_start,time_end,location,category,featured,status,created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            [ev["title"], ev["description"], ev.get("full_description"),
             ev["date"], ev.get("time_start"), ev.get("time_end"),
             ev["location"], ev["category"], ev.get("featured", False),
             "published", admin_id]
        )
        print(f"  ✔ {ev['title'][:60]}")

def seed_stories(admin_id: str):
    print("\n📖  Seeding stories...")
    for s in STORIES:
        existing = q("SELECT id FROM stories WHERE title = %s", [s["title"]])
        if existing:
            print(f"  skip (exists): {s['title'][:50]}")
            continue
        ex(
            "INSERT INTO stories (title,excerpt,content,author,category,read_time,status,created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            [s["title"], s["excerpt"], s["content"], s["author"],
             s["category"], s["read_time"], "published", admin_id]
        )
        print(f"  ✔ {s['title'][:60]}")

def seed_news(admin_id: str):
    print("\n📰  Seeding news...")
    for n in NEWS:
        existing = q("SELECT id FROM news WHERE title = %s", [n["title"]])
        if existing:
            print(f"  skip (exists): {n['title'][:50]}")
            continue
        ex(
            "INSERT INTO news (title,summary,content,category,author,status,created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s)",
            [n["title"], n["summary"], n["content"], n["category"], n["author"], "published", admin_id]
        )
        print(f"  ✔ {n['title'][:60]}")

def seed_gallery(admin_id: str):
    print("\n🖼   Seeding gallery placeholder entries...")
    for i, g in enumerate(GALLERY):
        existing = q("SELECT id FROM gallery WHERE title = %s", [g["title"]])
        if existing:
            print(f"  skip (exists): {g['title'][:50]}")
            continue
        ex(
            "INSERT INTO gallery (title,description,image_url,category,sort_order,created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            [g["title"], g.get("description"), "/logo.png",
             g["category"], i + 1, admin_id]
        )
        print(f"  ✔ {g['title'][:60]}")

def seed_leadership(admin_id: str):
    print("\n👥  Seeding leadership...")
    for l in LEADERSHIP:
        existing = q("SELECT id FROM leadership WHERE name = %s", [l["name"]]) if _table_exists("leadership") else []
        if existing:
            print(f"  skip (exists): {l['name']}")
            continue
        if not _table_exists("leadership"):
            print("  [SKIP] leadership table not found — add via admin panel")
            return
        ex(
            "INSERT INTO leadership (name,role,bio,sort_order,created_by) VALUES (%s,%s,%s,%s,%s)",
            [l["name"], l["role"], l["bio"], l["order"], admin_id]
        )
        print(f"  ✔ {l['name']}")

def _table_exists(name: str) -> bool:
    rows = q("SELECT 1 FROM information_schema.tables WHERE table_name=%s", [name])
    return bool(rows)

def main():
    print("=" * 60)
    print("  NZSL Cultural Foundation — Seed Data")
    print("=" * 60)

    admin_id = get_or_create_admin()
    print(f"  Using admin ID: {admin_id[:8]}...")

    seed_events(admin_id)
    seed_stories(admin_id)
    seed_news(admin_id)
    seed_gallery(admin_id)
    seed_leadership(admin_id)

    print("\n✅  Seed complete!")

if __name__ == "__main__":
    main()
