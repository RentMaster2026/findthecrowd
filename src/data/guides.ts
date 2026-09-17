/**
 * Guide pages.
 *
 * These exist to be found on Google. Somebody types "bars in Ottawa for a
 * Tuesday" into a phone, lands here, and sees a short honest answer plus live
 * crowd scores for every place named. That last part is the whole reason this
 * beats the listicles already ranking for those terms: theirs is a static page
 * written in 2023, ours updates itself every time somebody reports.
 *
 * Rules for writing these:
 *   - Plain language. Short sentences. No marketing voice.
 *   - Name real places and link every one to its venue page.
 *   - Say the honest thing, including when a place is not for everyone.
 *   - Never claim a place is good. Say what it is and let the score decide.
 *   - No dashes, no bold.
 */

export interface GuideEntry {
  /** Must match a slug in src/data/venues.ts so the card can show a live score. */
  venueSlug: string;
  /** Why this place is in this list. One or two sentences. */
  note: string;
}

export interface GuideSection {
  heading: string;
  /** Optional lead paragraph before the venue list. */
  intro?: string;
  entries: GuideEntry[];
}

export interface Guide {
  slug: string;
  /** The h1 and the page title. Written as the thing people search for. */
  title: string;
  /** Meta description. Under 160 characters. */
  description: string;
  /** One or two paragraphs under the h1. */
  intro: string[];
  sections: GuideSection[];
  /** Questions people actually ask, answered plainly. Also feeds FAQ markup. */
  faq: { q: string; a: string }[];
  updated: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "best-places-to-go-out-in-ottawa",
    title: "Best places to go out in Ottawa",
    description:
      "Where people in Ottawa actually go out, by neighbourhood, with live crowd reports from people already there tonight.",
    intro: [
      "Ottawa going out happens in about five places. If you know which five, the city is easy. If you do not, you end up on a quiet street wondering where everyone went.",
      "Here is the honest map of it. Every place below links to its page, where you can see how busy it is right now from people who are already inside.",
    ],
    sections: [
      {
        heading: "ByWard Market, where most nights start",
        intro:
          "The Market is the default. Highest density of bars in the city, everything within a five minute walk, and the reason most nights out in Ottawa end up here whether you planned it or not. It gets busy and it gets rowdy, especially after midnight on a Saturday.",
        entries: [
          { venueSlug: "heart-and-crown", note: "Five pubs joined together. Good first stop because you can move rooms without going outside." },
          { venueSlug: "berlin-nightclub", note: "The main club in the Market. House and techno downstairs, cocktails upstairs." },
          { venueSlug: "el-furniture-warehouse", note: "Cheap food until late and a loud room. Fills with students after eleven." },
          { venueSlug: "the-lookout-bar", note: "Ottawa's long running 2SLGBTQ+ bar. Karaoke Sunday and Wednesday." },
          { venueSlug: "chateau-lafayette", note: "The Laff. Open since 1849, cheap pints, no pretence. Worth seeing once even if it is not your night." },
        ],
      },
      {
        heading: "Elgin Street, easier and closer together",
        intro:
          "Elgin is a single strip, which makes it the easiest night out to plan. Start at one end, work down it. Less chaotic than the Market and the walk home to Centretown is short.",
        entries: [
          { venueSlug: "lieutenants-pump", note: "Pub downstairs, dance floor upstairs after midnight. An Elgin institution." },
          { venueSlug: "happy-fish-elgin", note: "The main dance floor on the street. Late and loud." },
          { venueSlug: "the-waverley", note: "Cocktails and food. Good place to start before the rest of the street fills." },
          { venueSlug: "live-on-elgin", note: "Small room for indie, acoustic and comedy. Shows usually start early." },
        ],
      },
      {
        heading: "Centretown and Bank Street, for a specific night",
        intro:
          "Nobody wanders into Centretown. You go because something is on. That makes it better than the Market on the right night and dead on the wrong one, so check before you walk over.",
        entries: [
          { venueSlug: "city-at-night", note: "Big room EDM with a real light rig. Latest close in the city." },
          { venueSlug: "city-gridwrks", note: "Underground electronic. Dark room, serious sound system, phones away crowd." },
          { venueSlug: "house-of-targ", note: "Pinball, perogies and a punk stage in the basement. Nothing else in Ottawa is like it." },
          { venueSlug: "irenes-pub", note: "Folk and jazz with a deep whisky list. Get there before the set starts or you are standing." },
        ],
      },
      {
        heading: "Lansdowne, when there is a game on",
        intro:
          "Lansdowne runs on the TD Place schedule. On a game night the whole area is full three hours before kickoff and empty by midnight. On a night with nothing on, do not bother.",
        entries: [
          { venueSlug: "td-place", note: "REDBLACKS, 67's and arena shows. Check what is on before you plan around it." },
          { venueSlug: "glebe-central-pub", note: "Craft list and game day overflow. Packed before and after anything at the stadium." },
        ],
      },
    ],
    faq: [
      {
        q: "What is the best area to go out in Ottawa?",
        a: "ByWard Market has the most bars in the smallest area, so it is the safest bet if you have not planned anything. Elgin Street is easier to walk and less rowdy. Centretown is better on a specific night when something is on.",
      },
      {
        q: "What time do bars close in Ottawa?",
        a: "Last call is 2am across Ontario, so most bars stop serving then and clear out shortly after. A few clubs stay open past that without serving alcohol.",
      },
      {
        q: "Is the ByWard Market safe at night?",
        a: "It is the busiest part of the city at night, which brings the usual busy nightlife district issues, mostly around Rideau and the late night food stops. Stay with people you know and it is fine.",
      },
    ],
    updated: "2026-09-17",
  },

  {
    slug: "bars-in-ottawa-by-age-group",
    title: "Bars in Ottawa by age group",
    description:
      "Which Ottawa bars skew student, which skew late twenties and thirties, and which have a proper mixed crowd. With live crowd reports.",
    intro: [
      "Walking into a room where you are ten years older or younger than everyone else is the fastest way to waste a night. Ottawa has a wide spread and the places do not advertise who actually turns up.",
      "This is rough guidance, not a rule. Crowds shift by night and by what is on. The live score on each page will tell you more about tonight than any list can.",
    ],
    sections: [
      {
        heading: "Student crowd, mostly 18 to 22",
        intro:
          "Ottawa has uOttawa and Carleton both close to the core, so the student crowd is large and concentrated. These rooms are cheap, loud and busy early in the week when everywhere else is quiet.",
        entries: [
          { venueSlug: "el-furniture-warehouse", note: "Cheap kitchen and a young room. Thursday is the student night." },
          { venueSlug: "the-show", note: "Big main room club, heavy on pop and EDM. Skews young on the weekend." },
          { venueSlug: "room-104", note: "Afrobeats and hip hop in an eighties arcade fit out. Young crowd, low cover." },
        ],
      },
      {
        heading: "Mid twenties, out to actually go out",
        intro:
          "The main weekend crowd. Old enough to be annoyed by a two hour line, young enough to still be out at two.",
        entries: [
          { venueSlug: "berlin-nightclub", note: "Multiple rooms means the crowd splits by what they came for." },
          { venueSlug: "happy-fish-elgin", note: "The Elgin dance floor. Mixed twenties, less student than the Market." },
          { venueSlug: "the-standard", note: "DJs and electronic in a narrow room. People come for the music." },
          { venueSlug: "nuvo-lounge-295", note: "Afrobeats and Caribbean nights. Dressier crowd, bottle service." },
        ],
      },
      {
        heading: "Late twenties and thirties, still out but sitting down",
        intro:
          "Rooms where you can hear the person across the table and nobody is queueing to get in.",
        entries: [
          { venueSlug: "copper-spirits-and-sights", note: "Rooftop on the sixteenth floor. Older crowd, seasonal, worth it for the view." },
          { venueSlug: "the-waverley", note: "Cocktails and a gastropub menu on Elgin. A room for a conversation." },
          { venueSlug: "lowertown-brewery", note: "Brewpub with live music most weekends. Mixed ages, nobody is performing." },
          { venueSlug: "north-and-navy", note: "Stand at the cicchetti bar with a spritz. A good start to a night that is not a big night." },
        ],
      },
      {
        heading: "Properly mixed, all ages in one room",
        intro:
          "Places where the crowd is set by the music or the thing happening, not by age. Usually the most interesting rooms in the city.",
        entries: [
          { venueSlug: "house-of-targ", note: "Pinball brings everyone from nineteen to fifty. Nobody cares how old you are." },
          { venueSlug: "rainbow-bistro", note: "Blues since 1984. The crowd is whoever is into the band that night." },
          { venueSlug: "dominion-tavern", note: "Punk and metal dive. Age has nothing to do with it." },
          { venueSlug: "the-27-club", note: "Local and touring bands, DJ sets after. Crowd changes completely by the show." },
        ],
      },
    ],
    faq: [
      {
        q: "What is the drinking age in Ottawa?",
        a: "Nineteen in Ontario. Most Ottawa bars and clubs are nineteen plus and will check ID at the door. Gatineau across the river is eighteen, which is why some younger groups cross the bridge.",
      },
      {
        q: "Where do students go out in Ottawa?",
        a: "Mostly ByWard Market, especially Clarence Street. Thursday is the big student night because both uOttawa and Carleton schedule around it.",
      },
      {
        q: "Where can you go out in Ottawa in your thirties?",
        a: "Elgin Street, the rooftop bars, the brewpubs and the live music rooms. Any place where the draw is the music or the food rather than the dance floor.",
      },
    ],
    updated: "2026-09-17",
  },

  {
    slug: "ottawa-bars-every-night-of-the-week",
    title: "Where to go out in Ottawa every night of the week",
    description:
      "A bar worth going to in Ottawa on every night, Monday through Sunday, including the quiet nights. With live crowd reports.",
    intro: [
      "Friday and Saturday sort themselves out. The hard nights are Monday through Wednesday, when most of the city is shut and the places that are open are empty.",
      "Here is one good answer for each night. Check the live score before you go, because a Tuesday can die without warning.",
    ],
    sections: [
      {
        heading: "Monday",
        intro: "The quietest night in Ottawa by a distance. Go somewhere that is fine when it is quiet.",
        entries: [
          { venueSlug: "chateau-lafayette", note: "The Laff does not need a crowd to be worth sitting in. Cheap and open." },
          { venueSlug: "dominion-tavern", note: "Pinball and a cheap pint. Quiet Monday is the point." },
        ],
      },
      {
        heading: "Tuesday",
        intro: "Slightly more open than Monday. Still thin.",
        entries: [
          { venueSlug: "live-on-elgin", note: "Often has a stand up night. Early show, home at a reasonable hour." },
          { venueSlug: "el-camino", note: "Tacos and a raw bar in a dark basement. Works on a night with nothing on." },
        ],
      },
      {
        heading: "Wednesday",
        intro: "The city starts waking up. Karaoke night across several rooms.",
        entries: [
          { venueSlug: "the-lookout-bar", note: "Karaoke Wednesday. One of the reliably busy midweek rooms." },
          { venueSlug: "irenes-pub", note: "Usually a session on. Small room, get there early." },
        ],
      },
      {
        heading: "Thursday",
        intro: "The real start of the Ottawa weekend, especially while university is in. Thursday in the Market is busier than Friday in a lot of cities.",
        entries: [
          { venueSlug: "el-furniture-warehouse", note: "The student Thursday. Loud from ten." },
          { venueSlug: "heart-and-crown", note: "Live trad most Thursdays. Easy start before the Market fills." },
          { venueSlug: "lowertown-brewery", note: "Patio in summer, live music, mixed crowd." },
        ],
      },
      {
        heading: "Friday",
        intro: "Everything is open. The only question is which room.",
        entries: [
          { venueSlug: "berlin-nightclub", note: "Resident house night downstairs. Doors around ten thirty." },
          { venueSlug: "city-gridwrks", note: "Warehouse night, runs late. For people who came for the music." },
          { venueSlug: "house-of-targ", note: "Perogies, pinball and a punk bill. Never the same twice." },
          { venueSlug: "happy-fish-elgin", note: "The Elgin dance floor at full volume." },
        ],
      },
      {
        heading: "Saturday",
        intro: "The busiest night. Expect lines after eleven at anything in the Market. Check the score before you queue.",
        entries: [
          { venueSlug: "city-at-night", note: "Big room, late close. The last stop for a lot of Saturdays." },
          { venueSlug: "the-palace", note: "Two storeys and room for nearly five hundred." },
          { venueSlug: "lieutenants-pump", note: "Upstairs after midnight. No cover, which matters by that point in the night." },
          { venueSlug: "swizzles-bar-and-grill", note: "Drag revue most Saturdays. Book a table if you want to sit." },
        ],
      },
      {
        heading: "Sunday",
        intro: "Better than people expect. A handful of rooms make Sunday their night.",
        entries: [
          { venueSlug: "the-lookout-bar", note: "Sunday karaoke. Reliably busy when the rest of the city is done." },
          { venueSlug: "shawarma-palace", note: "Not a bar. Still where a lot of Ottawa weekends actually finish." },
        ],
      },
    ],
    faq: [
      {
        q: "What is the best night to go out in Ottawa?",
        a: "Thursday if you want it busy without the Saturday lines, especially during term. Saturday is the biggest but expect to queue in the Market after eleven.",
      },
      {
        q: "Is anything open in Ottawa on a Monday night?",
        a: "Yes, but much less. The older pubs and dive bars stay open and are fine quiet. Clubs mostly do not open Monday.",
      },
      {
        q: "What time does it get busy in Ottawa?",
        a: "Bars fill around ten, clubs around eleven thirty, and lines are worst between eleven and one. Last call is 2am.",
      },
    ],
    updated: "2026-09-17",
  },

  {
    slug: "best-restaurants-in-ottawa",
    title: "Best restaurants in Ottawa",
    description:
      "Where to eat in Ottawa, from tasting menus to the 2am shawarma, with live reports on how busy each room is right now.",
    intro: [
      "Ottawa punches above its size on food and most visitors never find out, because the good rooms are spread across four neighbourhoods rather than sitting on one strip.",
      "This is a short list, not a ranking of everything. Each place links to its page where you can see how busy it is tonight and how long the wait is.",
    ],
    sections: [
      {
        heading: "Book ahead, worth the occasion",
        intro:
          "These need a reservation, sometimes weeks out. Set menus, one seating, the kind of meal that is the whole evening.",
        entries: [
          { venueSlug: "atelier", note: "Set modernist tasting menu, no substitutions. Book well ahead." },
          { venueSlug: "perch", note: "Canadian tasting menu on Preston. Small room, one seating a night." },
          { venueSlug: "antheia", note: "Chef's counter built around fermentation. You watch the whole thing happen." },
          { venueSlug: "beckta", note: "Tasting menus and a deep wine list. The Elgin Street special occasion room." },
        ],
      },
      {
        heading: "The rooms people actually take people to",
        intro:
          "Good food without the ceremony. You can get into most of these on a weeknight if you call.",
        entries: [
          { venueSlug: "riviera", note: "Old bank hall on Sparks. Contemporary Canadian and a proper bar to wait at." },
          { venueSlug: "north-and-navy", note: "Northern Italian. If the tables are gone, stand at the cicchetti bar." },
          { venueSlug: "supply-and-demand", note: "House made pasta and a raw bar. Loud and busy, worth the wait." },
          { venueSlug: "elise", note: "French cooking with Canadian ingredients, off the main Westboro strip." },
          { venueSlug: "restaurant-e18hteen", note: "Stone heritage room in the Market. Open later than most of its class." },
        ],
      },
      {
        heading: "Casual, all day, or late",
        intro:
          "Where you go when you did not plan anything, or when it is one in the morning.",
        entries: [
          { venueSlug: "corner-peach", note: "All day room leaning on local produce. Long lunches turn into dinner here." },
          { venueSlug: "el-camino", note: "Tacos and a raw bar. Dark basement, late, no reservations at the bar." },
          { venueSlug: "shawarma-palace", note: "The 2am shawarma most Ottawa nights end at. Cash is faster than the card machine." },
        ],
      },
    ],
    faq: [
      {
        q: "What food is Ottawa known for?",
        a: "Shawarma more than anything else. Ottawa has an unusual number of shawarma shops for its size and they stay open very late. Beavertails and the ByWard Market food stalls are the tourist answer.",
      },
      {
        q: "Where do you eat before a night out in Ottawa?",
        a: "The ByWard Market if you are drinking in the Market afterwards, Elgin Street if you are staying on Elgin, and Preston or Somerset West if you want the better food and do not mind a short cab.",
      },
      {
        q: "Do you need reservations in Ottawa?",
        a: "For the tasting menu places, yes, often weeks ahead. For most other rooms a weeknight walk in is fine and a weekend one is a gamble. Check the live wait on each page before you go.",
      },
    ],
    updated: "2026-09-17",
  },
];

export const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
