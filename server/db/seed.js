const pool = require("./pool");
const bcrypt = require("bcryptjs");

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || "admin@nzslfoundation.org.nz";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO admins (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail, passwordHash, "Foundation Administrator", "superadmin"]
    );
    console.log("✅ Admin user created");

    // Insert default settings
    const defaultSettings = [
      ["site_name", "New Zealand Sri Lanka Cultural Foundation", "general"],
      [
        "site_tagline",
        "Preserving Heritage. Connecting Communities.",
        "general",
      ],
      [
        "site_description",
        "The New Zealand Sri Lanka Cultural Foundation is dedicated to preserving, showcasing, and celebrating Sri Lankan culture in Aotearoa New Zealand.",
        "general",
      ],
      ["contact_email", "info@nzslfoundation.org.nz", "contact"],
      ["contact_phone", "+64 4 567 8901", "contact"],
      ["contact_address", "Wellington, New Zealand", "contact"],
      ["hero_heading_1", "Preserving Heritage.", "homepage"],
      ["hero_heading_2", "Connecting Communities.", "homepage"],
      [
        "hero_subtitle",
        "Dedicated to preserving, showcasing, and celebrating Sri Lankan culture in Aotearoa New Zealand through events, storytelling, and community.",
        "homepage",
      ],
      ["stat_events", "12+", "homepage"],
      ["stat_families", "500+", "homepage"],
      ["stat_programs", "24+", "homepage"],
      ["stat_years", "8+", "homepage"],
      [
        "about_mission",
        "To preserve and promote Sri Lankan cultural heritage in New Zealand, fostering understanding and appreciation between communities through education, events, and the arts.",
        "about",
      ],
      [
        "about_vision",
        "A thriving Sri Lankan cultural community in New Zealand where heritage is celebrated, traditions are preserved, and future generations are inspired to carry forward their cultural identity.",
        "about",
      ],
      [
        "about_story",
        "The New Zealand Sri Lanka Cultural Foundation was established with a singular vision: to create a lasting home for Sri Lankan culture in Aotearoa New Zealand. Founded by a group of passionate community leaders, the foundation has grown into a respected cultural institution that organizes events, preserves heritage, and builds bridges between Sri Lankan and New Zealand communities.",
        "about",
      ],
    ];

    for (const [key, value, category] of defaultSettings) {
      await client.query(
        "INSERT INTO settings (key, value, category) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING",
        [key, value, category]
      );
    }
    console.log("✅ Default settings inserted");

    // Seed events - Sri Lankan cultural events
    const events = [
      {
        title: "Sinhala & Tamil New Year Celebration 2026",
        description:
          "Experience the vibrant traditions of Aluth Awurudda, the Sinhala and Tamil New Year. Enjoy traditional games, authentic cuisine, cultural performances, and the warm spirit of community that defines this cherished celebration.",
        date: "2026-04-14",
        end_date: "2026-04-15",
        time_start: "10:00",
        time_end: "21:00",
        location: "Te Papa Tongarewa",
        address: "55 Cable Street, Wellington 6011",
        category: "festival",
        cover_image: null,
        featured: true,
        status: "published",
        tags: "{new year,sinhala,tamil,cultural,festival}",
      },
      {
        title: "Vesak Festival — The Festival of Light",
        description:
          "Celebrate Vesak, the most important Buddhist festival, with illuminated pandols, lanterns, traditional performances, and contemplative ceremonies. A night of beauty, peace, and spiritual reflection.",
        date: "2026-05-12",
        end_date: "2026-05-14",
        time_start: "17:00",
        time_end: "22:00",
        location: "Wellington Town Hall",
        address: "111 The Terrace, Wellington 6011",
        category: "cultural",
        cover_image: null,
        featured: true,
        status: "published",
        tags: "{vesak,buddhist,lanterns,cultural}",
      },
      {
        title: "Kandyan Dance Workshop",
        description:
          "An immersive workshop in the art of Kandyan dance, one of Sri Lanka's most revered classical dance forms. Learn the rhythmic footwork, graceful movements, and the rich cultural significance behind each gesture.",
        date: "2026-06-20",
        end_date: "2026-06-20",
        time_start: "10:00",
        time_end: "16:00",
        location: "New Zealand School of Dance",
        address: "26 Customs Street, Auckland 1010",
        category: "workshop",
        cover_image: null,
        featured: false,
        status: "published",
        tags: "{kandyan,dance,workshop,traditional}",
      },
      {
        title: "Sri Lankan Heritage Photography Exhibition",
        description:
          "A stunning visual journey through Sri Lanka's heritage — from ancient temple cities to lush tea plantations, from vibrant street festivals to serene coastal landscapes. Featuring works by Sri Lankan-New Zealand photographers.",
        date: "2026-07-01",
        end_date: "2026-07-31",
        time_start: "10:00",
        time_end: "18:00",
        location: "Auckland Art Gallery",
        address: "Kitchener Street, Auckland 1010",
        category: "exhibition",
        cover_image: null,
        featured: true,
        status: "published",
        tags: "{photography,heritage,exhibition,sri lanka}",
      },
      {
        title: "Traditional Sri Lankan Cooking Class",
        description:
          "Discover the flavors of Sri Lanka in this hands-on cooking workshop. Learn to prepare authentic dishes including hoppers, kottu roti, dhal curry, and traditional sweets, guided by experienced Sri Lankan chefs.",
        date: "2026-08-15",
        end_date: "2026-08-15",
        time_start: "11:00",
        time_end: "15:00",
        location: "Wellington Community Centre",
        address: "84 Abel Smith Street, Wellington 6011",
        category: "workshop",
        cover_image: null,
        featured: false,
        status: "published",
        tags: "{cooking,food,workshop,sri lankan cuisine}",
      },
      {
        title: "Cultural Gala — Bridges of Heritage",
        description:
          "An evening of elegance celebrating Sri Lankan culture through classical music, Bharatanatyam and Kandyan dance, poetry readings, and a showcase of traditional textiles and art. A premium cultural experience.",
        date: "2026-09-20",
        end_date: "2026-09-20",
        time_start: "18:00",
        time_end: "23:00",
        location: "Michael Fowler Centre",
        address: "111 The Terrace, Wellington 6011",
        category: "performance",
        cover_image: null,
        featured: true,
        status: "published",
        tags: "{gala,music,dance,performance,cultural}",
      },
      {
        title: "Youth Heritage Program — Our Roots, Our Future",
        description:
          "A dedicated program for young Sri Lankan-New Zealanders to explore their cultural roots through storytelling workshops, traditional arts, language classes, and mentorship from community elders.",
        date: "2026-10-10",
        end_date: "2026-12-15",
        time_start: "14:00",
        time_end: "17:00",
        location: "Wellington Central Library",
        address: "Victoria Street, Wellington 6011",
        category: "community",
        cover_image: null,
        featured: false,
        status: "published",
        tags: "{youth,heritage,education,community}",
      },
      {
        title: "Poson Festival — Celebrating Buddhism in Sri Lanka",
        description:
          "Join the celebration of Poson, marking the arrival of Buddhism in Sri Lanka. Features traditional ceremonies, cultural performances, and community gatherings celebrating this important heritage moment.",
        date: "2026-06-11",
        end_date: "2026-06-12",
        time_start: "16:00",
        time_end: "21:00",
        location: "Wellington Buddhist Centre",
        address: "123 Abel Smith Street, Wellington 6011",
        category: "cultural",
        cover_image: null,
        featured: false,
        status: "published",
        tags: "{poson,buddhist,cultural,heritage}",
      },
    ];

    for (const event of events) {
      await client.query(
        `INSERT INTO events (title, description, date, end_date, time_start, time_end, location, address, category, cover_image, featured, status, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT DO NOTHING`,
        [
          event.title,
          event.description,
          event.date,
          event.end_date,
          event.time_start,
          event.time_end,
          event.location,
          event.address,
          event.category,
          event.cover_image,
          event.featured,
          event.status,
          event.tags,
        ]
      );
    }
    console.log("✅ Events seeded");

    // Seed gallery
    const galleryItems = [
      {
        title: "Temple of the Sacred Tooth Relic",
        description:
          "The iconic Temple of the Sacred Tooth in Kandy, Sri Lanka",
        image_url: "/images/gallery/tooth-temple.jpg",
        category: "heritage",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 1,
      },
      {
        title: "Kandyan Dancers in Full Regalia",
        description:
          "Traditional Kandyan dancers performing at a cultural event",
        image_url: "/images/gallery/kandyan-dancers.jpg",
        category: "performance",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 2,
      },
      {
        title: "Sri Lankan New Year Traditions",
        description: "Traditional games and celebrations during Aluth Awurudda",
        image_url: "/images/gallery/new-year-traditions.jpg",
        category: "events",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 3,
      },
      {
        title: "Vesak Lanterns Illumination",
        description: "Beautiful illuminated lanterns during Vesak celebrations",
        image_url: "/images/gallery/vesak-lanterns.jpg",
        category: "culture",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 4,
      },
      {
        title: "Traditional Sri Lankan Cuisine",
        description: "A spread of authentic Sri Lankan dishes",
        image_url: "/images/gallery/sri-lankan-cuisine.jpg",
        category: "culture",
        photographer: "NZSL Foundation",
        featured: false,
        sort_order: 5,
      },
      {
        title: "Sigiriya Rock Fortress",
        description:
          "The ancient Sigiriya rock fortress, a UNESCO World Heritage site",
        image_url: "/images/gallery/sigiriya.jpg",
        category: "heritage",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 6,
      },
      {
        title: "Community Gathering in Wellington",
        description: "Sri Lankan community gathering in New Zealand",
        image_url: "/images/gallery/community-gathering.jpg",
        category: "events",
        photographer: "NZSL Foundation",
        featured: false,
        sort_order: 7,
      },
      {
        title: "Traditional Mask Making",
        description: "Artisan crafting traditional Sri Lankan ceremonial masks",
        image_url: "/images/gallery/mask-making.jpg",
        category: "arts",
        photographer: "NZSL Foundation",
        featured: false,
        sort_order: 8,
      },
      {
        title: "Tea Plantations of Sri Lanka",
        description: "Lush green tea plantations in the hill country",
        image_url: "/images/gallery/tea-plantations.jpg",
        category: "heritage",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 9,
      },
      {
        title: "Bharatanatyam Performance",
        description:
          "Classical Bharatanatyam dance performance at a foundation event",
        image_url: "/images/gallery/bharatanatyam.jpg",
        category: "performance",
        photographer: "NZSL Foundation",
        featured: true,
        sort_order: 10,
      },
    ];

    for (const item of galleryItems) {
      await client.query(
        `INSERT INTO gallery (title, description, image_url, category, photographer, featured, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [
          item.title,
          item.description,
          item.image_url,
          item.category,
          item.photographer,
          item.featured,
          item.sort_order,
        ]
      );
    }
    console.log("✅ Gallery seeded");

    // Seed stories
    const stories = [
      {
        title: "The Legacy of Sri Lankan Tea: From Ceylon to the World",
        subtitle:
          "How Sri Lanka's tea heritage shaped a nation and captivated global taste",
        content:
          "Sri Lanka's tea heritage is one of the most remarkable stories in the world of agriculture and culture. What began in 1867 when James Taylor planted the first commercial tea plantation in the central highlands has grown into one of the island's most defining cultural and economic identities.\n\nThe misty mountains of Nuwara Eliya, Ella, and Kandy provide the perfect terroir for Ceylon tea, known worldwide for its distinctive flavor and exceptional quality. The art of tea plucking, processing, and tasting has been passed down through generations, creating a living heritage that connects communities.\n\nToday, Sri Lankan tea culture is not just about the beverage — it's about hospitality, ritual, and the communal act of sharing a cup of tea. In New Zealand, the Sri Lankan community continues this tradition, using tea as a symbol of welcome, friendship, and cultural pride.",
        cover_image: null,
        author: "Dr. Amara Wickramasinghe",
        category: "heritage",
        featured: true,
        status: "published",
        read_time: 8,
        tags: "{tea,heritage,culture,sri lanka}",
      },
      {
        title: "Preserving Kandyan Dance in Aotearoa",
        subtitle:
          "How Sri Lankan-New Zealanders keep classical dance traditions alive",
        content:
          "Kandyan dance, or Uda Rata Natum, is one of Sri Lanka's most treasured classical art forms. Originating in the central highlands around the city of Kandy, this dance tradition dates back centuries and is deeply intertwined with the island's Buddhist heritage and royal courts.\n\nIn New Zealand, a dedicated group of dancers, teachers, and cultural advocates work tirelessly to preserve and promote Kandyan dance. Through regular workshops, performances at community events, and youth training programs, they ensure that this magnificent art form continues to thrive far from its island home.\n\nThe journey of Kandyan dance from the temples of Sri Lanka to the stages of New Zealand is a testament to the power of cultural dedication. Each performance is not just a display of skill — it is an act of preservation, a bridge between generations, and a gift to the wider New Zealand community.",
        cover_image: null,
        author: "Kumari De Silva",
        category: "culture",
        featured: true,
        status: "published",
        read_time: 10,
        tags: "{kandyan,dance,heritage,culture}",
      },
      {
        title: "Sri Lankan New Year: A Celebration of Renewal",
        subtitle:
          "The ancient traditions of Aluth Awurudda in modern New Zealand",
        content:
          "The Sinhala and Tamil New Year, known as Aluth Awurudda, is one of the most cherished celebrations in Sri Lankan culture. Falling in mid-April, this harvest festival marks the end of the farming season and the beginning of a new year, governed by astrological calculations that dictate auspicious times for every activity.\n\nFrom lighting the hearth at the precise auspicious moment to sharing traditional sweets like kavum and kokis, every ritual carries deep cultural significance. The tradition of visiting elders, exchanging gifts, and participating in village games strengthens the bonds of community and family.\n\nIn New Zealand, the Sri Lankan community brings these traditions to life with remarkable authenticity. The annual New Year celebration has become one of the most anticipated cultural events, drawing visitors from across the country who come to experience the warmth and joy of this ancient celebration.",
        cover_image: null,
        author: "Nisha Jayawardena",
        category: "culture",
        featured: true,
        status: "published",
        read_time: 7,
        tags: "{new year,sinhala,tamil,traditions,celebration}",
      },
      {
        title: "Building Bridges: Sri Lankan Culture in New Zealand",
        subtitle:
          "How the foundation connects communities through shared heritage",
        content:
          "The New Zealand Sri Lanka Cultural Foundation was born from a simple but powerful idea: that culture is the bridge that connects people across borders, generations, and traditions. Since its establishment, the foundation has worked to create meaningful connections between Sri Lankan and New Zealand communities.\n\nThrough cultural events, educational programs, and community gatherings, the foundation has introduced thousands of New Zealanders to the beauty and richness of Sri Lankan heritage. From the elegance of traditional dance to the warmth of shared meals, every event is an opportunity for cultural exchange and understanding.\n\nThe foundation's work extends beyond events. Through heritage preservation projects, youth mentorship programs, and partnerships with New Zealand cultural institutions, it is building a lasting legacy that will ensure Sri Lankan culture continues to thrive in Aotearoa for generations to come.",
        cover_image: null,
        author: "NZSL Cultural Foundation",
        category: "community",
        featured: false,
        status: "published",
        read_time: 6,
        tags: "{foundation,community,culture,bridges}",
      },
    ];

    for (const story of stories) {
      await client.query(
        `INSERT INTO stories (title, subtitle, content, cover_image, author, category, featured, status, read_time, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [
          story.title,
          story.subtitle,
          story.content,
          story.cover_image,
          story.author,
          story.category,
          story.featured,
          story.status,
          story.read_time,
          story.tags,
        ]
      );
    }
    console.log("✅ Stories seeded");

    // Seed leadership
    const leadershipMembers = [
      {
        name: "Dr. Arjun Fernando",
        role: "Chairperson",
        bio: "Dr. Arjun Fernando is a visionary leader who has dedicated his career to bridging Sri Lankan and New Zealand cultures. With a background in international relations and community development, he has guided the foundation through its most transformative years.",
        contribution:
          "Established the foundation's cultural exchange programs and forged partnerships with major New Zealand cultural institutions.",
        sort_order: 1,
        featured: true,
      },
      {
        name: "Amara Wickramasinghe",
        role: "Vice Chairperson",
        bio: "Amara Wickramasinghe is a respected educator and cultural advocate who has spent decades promoting Sri Lankan heritage in New Zealand. Her expertise in cultural education has shaped the foundation's youth and heritage programs.",
        contribution:
          "Designed and launched the foundation's youth heritage education initiative, reaching over 200 young people annually.",
        sort_order: 2,
        featured: true,
      },
      {
        name: "Prof. Sunil Perera",
        role: "Cultural Director",
        bio: "Professor Sunil Perera is a renowned scholar of South Asian art and culture. His deep knowledge of Sri Lankan traditions and artistic heritage ensures that the foundation's cultural programming maintains the highest standards of authenticity and excellence.",
        contribution:
          "Curated the foundation's annual cultural gala and heritage exhibition series.",
        sort_order: 3,
        featured: true,
      },
      {
        name: "Nisha Jayawardena",
        role: "Community Relations Director",
        bio: "Nisha Jayawardena brings warmth, passion, and organizational excellence to everything she does. As Community Relations Director, she has built an extensive network of community partnerships and volunteer programs that power the foundation's initiatives.",
        contribution:
          "Built a network of 50+ community partnerships and established the foundation's volunteer program.",
        sort_order: 4,
        featured: true,
      },
      {
        name: "Dr. Kumari De Silva",
        role: "Heritage Preservation Officer",
        bio: "Dr. Kumari De Silva is a leading expert in intangible cultural heritage preservation. Her work in documenting and preserving Sri Lankan traditions, from dance forms to culinary practices, ensures that these treasures are safeguarded for future generations.",
        contribution:
          "Led the foundation's digital heritage archive project, preserving over 500 cultural artifacts and oral histories.",
        sort_order: 5,
        featured: false,
      },
    ];

    for (const member of leadershipMembers) {
      await client.query(
        `INSERT INTO leadership (name, role, bio, contribution, sort_order, featured)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [
          member.name,
          member.role,
          member.bio,
          member.contribution,
          member.sort_order,
          member.featured,
        ]
      );
    }
    console.log("✅ Leadership seeded");

    console.log("🎉 Database seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
