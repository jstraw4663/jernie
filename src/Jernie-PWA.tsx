// @ts-nocheck — types deferred; will be added during CSS/architecture refactor (phase:foundation)
import { useState, useEffect } from "react";

const WMO: Record<number,{e:string,d:string}> = {
  0:{e:"☀️",d:"Clear"},1:{e:"🌤️",d:"Mostly Clear"},2:{e:"⛅",d:"Partly Cloudy"},3:{e:"☁️",d:"Overcast"},
  45:{e:"🌫️",d:"Foggy"},48:{e:"🌫️",d:"Foggy"},51:{e:"🌦️",d:"Drizzle"},53:{e:"🌦️",d:"Drizzle"},
  55:{e:"🌧️",d:"Rain"},61:{e:"🌧️",d:"Light Rain"},63:{e:"🌧️",d:"Rain"},65:{e:"🌧️",d:"Heavy Rain"},
  71:{e:"🌨️",d:"Snow"},73:{e:"🌨️",d:"Snow"},75:{e:"❄️",d:"Heavy Snow"},80:{e:"🌦️",d:"Showers"},
  81:{e:"🌧️",d:"Showers"},82:{e:"⛈️",d:"Storms"},95:{e:"⛈️",d:"Thunderstorm"},99:{e:"⛈️",d:"Severe Storm"}
};
const wmo = (c:number) => WMO[c] || {e:"🌡️",d:"—"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const appleMaps = (addr:string) => "https://maps.apple.com/?q=" + encodeURIComponent(addr);

const DEPARTURE = new Date("2026-05-22T08:20:00-04:00");

function useCountdown() {
  const calc = () => {
    const diff = DEPARTURE.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ── Data ─────────────────────────────────────────────────────

const stops = [
  {
    id:"portland", city:"Portland, ME", dates:"May 22–24", emoji:"🦞", accent:"#2D6A8F", summary:"Your introduction to Maine — two and a half days to eat your way through the best food city in New England. Land, drop bags, and get straight to it. Portland Head Light and the Old Port on day one, the Lucky Catch lobster cruise on day two, then north on Sunday morning. Don't skip Eventide or Mr. Tuna. The lobster cruise is the highlight — gear up for it.",
    lat:43.6591, lon:-70.2568, wStart:"2026-05-22", wEnd:"2026-05-24",
    hotel:"Courtyard Downtown/Waterfront",
    hotelUrl:"https://www.marriott.com/en-us/hotels/pwmcw-courtyard-portland-downtown-waterfront/overview/",
    hotelAddr:"321 Commercial St, Portland, ME 04101",
    hotelNote:"Modern Marriott property on Commercial Street — you're steps from the Old Port, the harbor, and every restaurant worth going to. Parking on-site, which matters in Portland. Use it as a base and spend all your time outside it.",
    friendHotel:"Canopy by Hilton Portland Waterfront",
    friendHotelUrl:"https://www.hilton.com/en/hotels/pwmcapy-canopy-portland-waterfront/",
    friendHotelAddr:"9 Center St, Portland, ME 04101",
    friendHotelNote:"Hilton's lifestyle brand — newer, design-forward, with a rooftop bar and a location right on the water. More boutique feel than the standard Courtyard. Walking distance to everything.",
    bookings:[
      { icon:"✈️", label:"Outbound Flights — Jeremy & Jennie",
        flights:[
          {key:"WN351",  num:"WN 351",  airline:"Southwest", route:"CLT → BWI", dep:"8:20 AM",  arr:"9:50 AM",  date:"May 22", trackingUrl:"https://flightaware.com/live/flight/SWA351"},
          {key:"WN2365", num:"WN 2365", airline:"Southwest", route:"BWI → PWM", dep:"10:40 AM", arr:"12:10 PM", date:"May 22", trackingUrl:"https://flightaware.com/live/flight/SWA2365"},
        ]
      },
      { icon:"🚗", label:"Rental Car — Avis",
        lines:["Full-Size SUV","Pickup: Portland International Jetport (PWM)","Drop-off: Bangor International Airport (BGR) — May 29"],
        confirmationLink:{label:"Confirmation: 08749981US2", url:"https://www.avis.com/en/reservation/reservation-details?confirmationNumber=08749981US2&lastName=STRAW"}
      },
    ],
    itinerary:[
      {
        date:"Friday · May 22", label:"Arrival Day", emoji:"✈️",
        items:[
          {time:"12:10 PM ✈️", text:"Land at PWM · pick up Avis Full-Size SUV at the jetport", confirmed:true},
          {time:"Early Afternoon", text:"Check in at Courtyard Downtown/Waterfront — drop bags, freshen up, get oriented"},
          {time:"Mid-Afternoon", text:"Portland Head Light · 15 min drive to Cape Elizabeth · most photographed lighthouse in New England · go while it's not crowded yet"},
          {time:"Late Afternoon", text:"Old Port + Exchange Street · wander, browse, hit Ports of Call & Shipwreck & Cargo for souvenirs · grab Holy Donuts on the way back"},
          {time:"Evening", text:"Dinner at Eventide Oyster Co. or Mr. Tuna · go early to beat the wait"},
        ]
      },
      {
        date:"Saturday · May 23", label:"Lobster Day 🦞", emoji:"🦞",
        items:[
          {time:"Morning", text:"Breakfast at Tandem Coffee + Bakery · best breakfast sandwich in Portland · get there before the morning rush"},
          {time:"Mid-Morning", text:"Spring Point Ledge Lighthouse or Peaks Island Ferry + golf cart · pick one for the morning · both are easy and fun"},
          {time:"12:15 PM sharp 🦞", text:"Lucky Catch Lobstering Cruise · 90 min on the water hauling traps · Portland Lobster Co. cooks your catch right after", confirmed:true, addr:"170 Commercial St, Portland, ME 04101", addrLabel:"170 Commercial St, Portland, ME"},
          {time:"After the Cruise", text:"Harbor Fish Market · waterfront institution since 1966 · worth walking through even if you don't buy · pure, uncut Portland"},
          {time:"Mid-Afternoon", text:"Holy Donuts + Coastal Creamery · afternoon snack lap through the Old Port · non-negotiable"},
          {time:"Evening", text:"Dinner at Scales · splurge night on the wharf · reserve ahead or you won't get in", bookNow:true, bookingUrl:"https://www.opentable.com/scales"},
        ]
      },
      {
        date:"Sunday · May 24", label:"Drive North to Bar Harbor", emoji:"🚗",
        items:[
          {time:"Morning", text:"Breakfast at Becky's Diner · local institution · great chowder · no fuss · fuel up before the drive"},
          {time:"Mid-Morning", text:"Check out · load the SUV · ~2.5 hr drive to Bar Harbor via US-1"},
          {time:"En Route — Option A", text:"McLoon's Lobster · Spruce Head, Rockland area · legendary lobster shack on the water · worth the slight detour off US-1 through Thomaston/Rockland · call ahead", alert:true, addr:"3 Island Rd, South Thomaston, ME 04858", addrLabel:"McLoon's Lobster, South Thomaston, ME"},
          {time:"En Route — Option B", text:"Stop: Glisten Oyster Farm · Damariscotta, ME (right on the US-1 route) · call ahead to confirm hours", alert:true, addr:"Damariscotta, ME", addrLabel:"Damariscotta, ME"},
          {time:"Early Afternoon", text:"Arrive Bar Harbor · check in West Street Hotel + Bar Harbor Inn · drop bags"},
          {time:"Late Afternoon", text:"Agamont Park walk · harbor stroll · get your bearings before dinner · Bar Island low-tide crossing if tides align · check the chart before going", alert:true, tideUrl:"https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=8413320"},
          {time:"Evening", text:"Dinner at Havana · best restaurant in Bar Harbor · will be full Memorial Day weekend", bookNow:true, bookingUrl:"https://www.opentable.com/booking/restref/availability?rid=36787&lang=en-US&partySize=4&dateTime=2026-05-24T19:00"},
        ]
      }
    ],
    restaurants:[
      {name:"Eventide Oyster Co.", price:"$$$", typeEmoji:"🦞", type:"Seafood", must:true, rating:4.7, url:"https://www.eventideoysterco.com/portland", note:"Don't skip the brown butter lobster roll on a steamed bun. Expect a wait — go early or late.", source:"guide"},
      {name:"Scales", price:"$$$$", typeEmoji:"🦞", type:"Upscale Seafood", must:true, rating:4.6, url:"http://www.scalesrestaurant.com", note:"On the wharf with lobstermen docking outside the window. Splurge dinner of your Portland stay. Order the steamed lobster.", source:"guide"},
      {name:"Mr. Tuna", price:"$$$", typeEmoji:"🍣", type:"Sushi / Local Seafood", must:true, rating:4.7, url:"https://www.mrtunamaine.com", note:"Food & Wine's #6 Best Restaurant in the Country (2025). Built around sustainable Gulf of Maine seafood. Get the Tuna de Tigre.", source:"guide"},
      {name:"Luke's Lobster", price:"$$", typeEmoji:"🦞", type:"Lobster Roll", must:true, rating:4.5, url:"https://lukeslobster.com/location/portland-pier", note:"The original Portland lobster shack, born right here on the pier. Clean, sweet claw-and-knuckle on a butter-toasted roll. Fast, affordable, and excellent for lunch.", source:"stacy"},
      {name:"Tandem Coffee + Bakery", price:"$", typeEmoji:"🍳", type:"Breakfast", must:true, rating:4.6, url:"https://tandemcoffee.com", note:"Best breakfast sandwich in Portland. Counter service, communal tables. Get there before the morning rush. Their coffee program is serious — don't just grab and go.", source:"stacy"},
      {name:"Holy Donuts", price:"$", typeEmoji:"🍩", type:"Snacks", must:true, rating:4.5, url:"https://theholydonut.com", note:"Portland-famous potato donuts in rotating flavors. Dark chocolate sea salt and maple bacon are the moves. There will be a line. Worth every second.", source:"stacy"},
      {name:"Via Vecchia", price:"$$$", typeEmoji:"🍝", type:"Italian", must:false, rating:4.5, url:"https://www.viavecchiamaine.com", note:"Old-school Italian in a warm, candlelit Portland setting. Handmade pasta, wood-fired preparations. Perfect for a night when you need a break from seafood.", source:"stacy"},
      {name:"Cliff House Maine", price:"$$$$", typeEmoji:"🍽️", type:"Upscale Dining / Views", must:false, rating:4.6, url:"https://www.cliffhousemaine.com", note:"Located in York, ME — 30 min south of Portland, near Kennebunkport. Cliffside views, fire pits, exceptional dinner. Worth it if you want a splurge night on the Portland end of the trip.", source:"stacy", flag:"York, ME · near Portland"},
      {name:"Street & Co.", price:"$$$", typeEmoji:"🦞", type:"Seafood Bistro", must:false, rating:4.5, url:"https://www.streetandcompany.net", note:"Candle-lit brick-and-beam room, unfussy fresh seafood. Jonah crab sauté and sole Francaise are standouts.", source:"guide"},
      {name:"Becky's Diner", price:"$", typeEmoji:"🍳", type:"Breakfast", must:false, rating:4.4, url:"https://www.beckysdiner.com", note:"Local institution. Go before you drive north. Great chowder, no fuss.", source:"guide"},
      {name:"Bard Coffee", price:"$", typeEmoji:"☕", type:"Coffee", must:false, rating:4.6, url:"https://bardcoffee.com", note:"Specialty coffee in the Old Port. Single-origin pour-overs and excellent espresso. The right way to start any Portland morning.", source:"stacy"},
      {name:"Coastal Creamery", price:"$", typeEmoji:"🍦", type:"Ice Cream", must:false, rating:4.4, url:"https://www.instagram.com/coastalcreameryme", note:"Local scoop shop in the Old Port. The correct way to end an afternoon walk. Great flavors built around Maine ingredients.", source:"stacy"},
      {name:"Harbor Fish Market", price:"$$", typeEmoji:"🐟", type:"Seafood Market", must:false, rating:4.7, url:"https://www.harborfish.com", note:"Old-school waterfront fish market, open since 1966. Walk through for the full experience even if you don't buy anything. Pure, uncut Portland.", source:"stacy"},
    ],
    activities:[
      {actEmoji:"🗼", name:"Portland Head Light", note:"Most photographed lighthouse in New England. Fort Williams Park in Cape Elizabeth — 15 min from downtown. Rocky shoreline, dramatic drops to the sea. Go before golden hour for the best light.", url:"https://www.portlandheadlight.com", source:"stacy"},
      {actEmoji:"🛍️", name:"Old Port + Exchange Street", note:"Cobblestone waterfront district — wander, browse, eat. The heart of the city. Hit Ports of Call, Shipwreck & Cargo, and Soleil for souvenirs.", url:"https://www.portlandoldport.com", source:"guide"},
      {actEmoji:"🗼", name:"Spring Point Ledge Lighthouse", note:"Walk the granite causeway right up to the lighthouse. Great harbor views back to Portland. Combine with the Spring Point Shoreway trail for a longer loop.", url:"https://www.springpointlighthouse.org", source:"stacy"},
      {actEmoji:"⛴️", name:"Peaks Island Ferry + Golf Cart", note:"17-minute Casco Bay Lines ferry to a car-free island. Rent a golf cart and circle the island at your own pace. Surreal, quiet, gorgeous views back to the Portland skyline.", url:"https://cascobaylines.com", source:"stacy"},
      {actEmoji:"🚶", name:"Eastern Promenade Trail", note:"Scenic harbor overlook trail. Great for a morning walk before driving north.", url:"https://www.portlandmaine.gov/Facilities/Facility/Details/Eastern-Promenade-Trail-18", source:"guide"},
      {actEmoji:"🚒", name:"Portland Fire Engine Co. City Tour", note:"Hop-on tour of Portland in a vintage fire engine. Touristy but genuinely fun — especially with Ford along for the ride.", url:"https://portlandfireengineco.com", source:"stacy"},
      {actEmoji:"🚗", name:"Kennebunkport Day Trip", note:"30 min south on US-1. Beautiful coastal village, Dock Square shopping, Walker's Point (Bush compound) visible from the water. Worth a half day if the schedule allows.", url:"https://www.gokennebunks.com", source:"stacy"},
    ],
    alerts:[]
  },

  {
    id:"barharbor", city:"Bar Harbor, ME", dates:"May 24–27", emoji:"🏔️", accent:"#1B4D3E", summary:"Three days in Acadia — the physical center of this trip. Hike hard, eat well, and get on the water. The Beehive is yours if you want it; the Jordan Pond Loop works for everyone. Cadillac at sunrise on Wednesday morning requires a Recreation.gov reservation set two days prior at 10am EST. Book Havana the moment you read this if you haven't.",
    lat:44.3876, lon:-68.2039, wStart:"2026-05-24", wEnd:"2026-05-27",
    hotel:"West Street Hotel — King Ocean View",
    hotelUrl:"https://www.opalcollection.com/west-street/",
    hotelAddr:"50 West St, Bar Harbor, ME 04609",
    hotelConfirmation:"3418815665-1", hotelNote:"High floor ocean view room — Frenchman Bay spread out below you. Heated rooftop pool open year-round, boutique property, five-minute walk to everything in town. Bar Harbor Club access included: hot tub, spa, and fitness center.",
    friendHotel:"Bar Harbor Inn",
    friendHotelUrl:"https://www.barharborinn.com/",
    friendHotelAddr:"1 Newport Dr, Bar Harbor, ME 04609",
    friendHotelNote:"Classic Bar Harbor grande dame — oceanfront property with wraparound water views, private beach access, and the Reading Room restaurant on-site. Built in 1887, impeccably maintained. Steps to everything downtown.",
    bookings:[],
    itinerary:[
      {
        date:"Sunday · May 24", label:"Arrive Bar Harbor", emoji:"🚗",
        items:[
          {time:"Early Afternoon", text:"Arrive from Portland · check in West Street Hotel & Bar Harbor Inn · decompress from the drive"},
          {time:"Late Afternoon", text:"Agamont Park walk · easy waterfront stroll · get the lay of the land · perfect first activity with Ford"},
          {time:"Low Tide Window", text:"Bar Island crossing if tides allow — a land bridge appears at low tide only · check the chart before going · it's worth it", alert:true, tideUrl:"https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=8413320"},
          {time:"Evening", text:"Dinner at Havana · best restaurant in Bar Harbor · book before the trip — Memorial Day weekend fills it completely", bookNow:true, bookingUrl:"https://www.opentable.com/booking/restref/availability?rid=36787&lang=en-US&partySize=4&dateTime=2026-05-24T19:00"},
        ]
      },
      {
        date:"Monday · May 25", label:"Memorial Day", emoji:"🇺🇸",
        items:[
          {time:"Morning", text:"Breakfast at Jeannie's Great Maine Breakfast · buttermilk blueberry pancakes · go early before it fills up"},
          {time:"Mid-Morning", text:"Ocean Path Trail · easy 4-mile round trip along dramatic rocky shoreline · passes Thunder Hole, Sand Beach, Otter Cliff · perfect for the full group"},
          {time:"Near High Tide", text:"Thunder Hole · best when ocean swells hit 1–2 hours before high tide · check the chart before you go · it's spectacular when timed right", alert:true, tideUrl:"https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=8413320"},
          {time:"Afternoon", text:"Lunch at Peekytoe Provisions · freshest crab and lobster on the island · great after a morning walk"},
          {time:"Late Afternoon", text:"Free time · Sand Beach · Ben & Bill's ice cream · Sherman's Books · let Ford dictate the pace"},
          {time:"Evening", text:"Memorial Day fireworks on Bar Harbor waterfront · check local schedule for exact time · Agamont Park is the spot to watch from", alert:true},
        ]
      },
      {
        date:"Tuesday · May 26", label:"Hike Day — Acadia", emoji:"🥾",
        items:[
          {time:"Early Morning", text:"Beehive Trail — Jeremy & Jennie only (iron rungs bolted into cliff faces, exposed ledges, serious scramble). Stacy/Justin/Ford: Jordan Pond Loop instead (3.5 mi, flat, stunning glacial pond). Start early to beat the heat and crowds."},
          {time:"Late Morning", text:"Jordan Pond House Popovers · non-negotiable post-hike tradition · meet here as a group · famous popovers with jam and tea on the lawn"},
          {time:"Early Afternoon", text:"Thuya Garden · 20 min drive to Northeast Harbor · hidden formal hillside gardens · a quiet gem most tourists miss · especially beautiful in late May bloom"},
          {time:"Late Afternoon", text:"Sunset Sail from Bar Harbor pier · Margaret Todd tall ship or similar schooner · 2-hour sail into Frenchman Bay at golden hour · book a few days ahead"},
          {time:"Evening", text:"Dinner at The Reading Room (Bar Harbor Inn) · panoramic harbor views from nearly every seat · one splurge dinner for the setting alone", bookNow:true, bookingUrl:"https://www.opentable.com/reading-room-restaurant-at-the-bar-harbor-inn"},
        ]
      },
      {
        date:"Wednesday · May 27", label:"Sunrise + Move to Southwest Harbor", emoji:"🌅",
        items:[
          {time:"4:30 AM 🌅", text:"Cadillac Mountain Sunrise · first sunrise in the contiguous US in late spring · summit road requires Recreation.gov reservation 2 days prior at 10am EST · OR hike up on foot — no reservation needed for hikers · alarm set for 3:15am", alert:true},
          {time:"Morning", text:"Breakfast at Sunrise Cafe after you descend · best harbor views in Bar Harbor at breakfast · you've earned it"},
          {time:"Mid-Morning", text:"Schoodic Peninsula drive · 45 min · dramatic pink granite shoreline · raw, beautiful, far fewer crowds than the main island"},
          {time:"Afternoon", text:"Last lunch in Bar Harbor · Side Street Cafe lobster roll · then check out and pack up"},
          {time:"Late Afternoon", text:"Drive to Southwest Harbor (~30 min) · check in at The Claremont · settle in · take in the Somes Sound view from your deck"},
          {time:"Evening", text:"Dinner at Little Fern at The Claremont · best restaurant on this side of the island · reserve before you leave home", bookNow:true, bookingUrl:"https://resy.com/cities/southwest-harbor-me/venues/little-fern"},
        ]
      }
    ],
    restaurants:[
      {name:"Havana", price:"$$$$", typeEmoji:"🍽️", type:"American Fine Dining / Latin", must:true, rating:4.6, url:"https://www.havana318.com", note:"2025 James Beard Award semifinalist. Best restaurant in Bar Harbor by a mile. Book before the trip — it will be full Memorial Day weekend. Get the seafood paella and lobster moqueca.", source:"guide"},
      {name:"Peekytoe Provisions", price:"$$", typeEmoji:"🦞", type:"Seafood", must:true, rating:4.6, url:"https://www.peekytoeprovisions.com", note:"Best crab and lobster on the island. Seafood brought in fresh daily. Great for lunch after hiking.", source:"guide"},
      {name:"Jeannie's Great Maine Breakfast", price:"$", typeEmoji:"🍳", type:"Breakfast", must:true, rating:4.4, url:"https://www.jeanniesgreatmainebreakfast.com", note:"Buttermilk blueberry pancakes so loaded with berries the edges turn deep blue. Go early — it fills up fast.", source:"guide"},
      {name:"The Reading Room", price:"$$$$", typeEmoji:"🍽️", type:"Upscale Dining", must:true, rating:4.7, url:"https://www.barharborinn.com/dining", note:"Historic dining room inside the Bar Harbor Inn. Panoramic harbor views from nearly every seat. One splurge dinner for the setting alone — dress up slightly.", source:"stacy"},
      {name:"Sweet Pea's Farm Kitchen", price:"$$", typeEmoji:"🌿", type:"Farm-to-Table", must:true, rating:4.5, url:"https://www.sweetpeasfarmkitchen.com", note:"Tucked inside a working garden in full bloom. Farm-to-table breakfast and lunch with produce coming out of the ground that morning. Go with daylight — the garden is the whole point.", source:"stacy"},
      {name:"McLoon's Lobster", price:"$$", typeEmoji:"🦞", type:"Lobster Shack", must:true, rating:4.7, url:"https://mcloons.com", note:"NOT in Bar Harbor — this is in Spruce Head near Rockland, ~1.5 hrs south. It's an incredible stop on the Portland → Bar Harbor drive if you route through Thomaston/Rockland. Plan it as a road-trip lunch, not a BH dinner.", source:"stacy", flag:"Near Rockland · stop on drive from Portland"},
      {name:"McKay's Public House", price:"$$", typeEmoji:"🍺", type:"Casual Dinner", must:false, rating:4.4, url:"https://www.mckayspublichouse.com", note:"Cozy Bar Harbor gastropub. Good burgers and local seafood in an unfussy setting. Great for a lower-key dinner night.", source:"stacy"},
      {name:"Sunrise Cafe", price:"$", typeEmoji:"🍳", type:"Breakfast", must:false, rating:4.4, url:"https://www.sunrisecafebarharbor.com", note:"Best breakfast views in Bar Harbor. Eggs, pancakes, harbor out every window. Perfect after an early Cadillac Mountain sunrise.", source:"stacy"},
      {name:"Abel's on the Water", price:"$$$", typeEmoji:"⚓", type:"Waterfront Dining", must:false, rating:4.4, url:"https://abelsonthewater.com", note:"Casual waterfront dining on Eagle Lake, ~20 min from town. Fresh lobster and fish on the water. A quieter alternative to downtown.", source:"stacy"},
      {name:"Side Street Cafe", price:"$$", typeEmoji:"🦞", type:"Casual Lobster Roll", must:false, rating:4.4, url:"https://www.sidestreetbarharbor.com", note:"Local go-to for a classic lobster roll at a fair price. Patio seating, no pretense.", source:"guide"},
      {name:"Ben & Bill's Chocolate Emporium", price:"$", typeEmoji:"🍦", type:"Ice Cream", must:false, rating:4.4, url:"https://www.benandbills.com", note:"Bar Harbor institution. Famous for outrageous flavors including the polarizing lobster ice cream. A rite of passage whether you finish the cone or not.", source:"stacy"},
      {name:"Rose Eden Lobster", price:"$$", typeEmoji:"🦞", type:"Seafood Takeout", must:false, rating:4.5, url:"https://www.roseedenlobster.com", note:"Opens Memorial Day weekend. Grab lobster to-go and eat on the harbor. The quintessential Maine moment.", source:"guide"},
    ],
    activities:[
      {actEmoji:"🥾", group:"Hikes", name:"Beehive Trail ⭐", note:"Best hike in the park. Iron rungs bolted into cliff faces, exposed ledges, ocean views. Jeremy & Jennie only — not suitable for everyone. Athletic and dramatic.", url:"https://www.alltrails.com/trail/us/maine/the-beehive-loop-trail", source:"guide"},
      {actEmoji:"🥾", group:"Hikes", name:"Cadillac Mountain Sunrise 🌅", note:"Cadillac is the first place in the contiguous US to see sunrise in late spring. Summit road reservation required via Recreation.gov 2 days prior at 10am EST — or hike up on foot, no reservation needed.", url:"https://www.alltrails.com/trail/us/maine/cadillac-north-ridge-trail", source:"stacy"},
      {actEmoji:"🥾", group:"Hikes", name:"Jordan Pond Loop + Popovers", note:"Stunning glacial pond surrounded by peaks. 3.5 miles, flat and easy. The Jordan Pond House serves famous popovers with jam and tea right after — don't skip it.", url:"https://www.alltrails.com/trail/us/maine/jordan-pond-path", source:"guide"},
      {actEmoji:"🥾", group:"Hikes", name:"Ship Harbor Trail", note:"Easy 1.3-mile loop through spruce forest to a rocky shoreline. Great short walk on the quieter western side of the island — no crowds.", url:"https://www.alltrails.com/trail/us/maine/ship-harbor-trail", source:"stacy"},
      {actEmoji:"⛵", group:"On the Water", name:"Sunset Sail", note:"Several schooner options depart from the Bar Harbor pier. The Margaret Todd tall ship is the classic — 2-hour sail into Frenchman Bay at golden hour. Book a few days ahead.", url:"https://downeastwindjammer.com", source:"stacy"},
      {actEmoji:"🌊", group:"On the Water", name:"Thunder Hole", note:"Carved sea cave along Ocean Path. Ocean swells compress into the cave and blast upward — go 1–2 hours before high tide for maximum drama. Check tide charts before you go.", url:"https://www.nps.gov/acad/planyourvisit/thunder-hole.htm", source:"stacy"},
      {actEmoji:"🌊", group:"On the Water", name:"Bar Island at Low Tide", note:"A land bridge connects downtown to Bar Island at low tide only. Walk across, hike up for harbor views, get back before the tide covers the crossing. Check charts — the window is short.", url:"https://www.nps.gov/acad/planyourvisit/bar-island-trail.htm", source:"guide"},
      {actEmoji:"🚶", group:"Walks & Views", name:"Ocean Path Trail", note:"Easy 4-mile round trip along dramatic rocky shoreline. Passes Thunder Hole, Sand Beach, and Otter Cliff. Perfect for the full group — flat, manageable with Ford.", url:"https://www.nps.gov/acad/planyourvisit/ocean-path.htm", source:"stacy"},
      {actEmoji:"🚶", group:"Walks & Views", name:"Agamont Park", note:"Small but beautiful waterfront park in downtown Bar Harbor. Easy harbor stroll, great views. Good first walk after you arrive to get oriented.", url:"https://www.barharbormaine.gov/213/Agamont-Park", source:"stacy"},
      {actEmoji:"🚗", group:"Walks & Views", name:"Schoodic Peninsula", note:"Underrated section of Acadia, 45 min from Bar Harbor. Pink granite shoreline meets open Atlantic. Far fewer crowds than the main island — dramatic, raw, and worth every minute of the drive.", url:"https://www.nps.gov/acad/planyourvisit/schoodic.htm", source:"stacy"},
      {actEmoji:"🌿", group:"Nature & Culture", name:"Thuya Garden", note:"Hidden formal garden in Northeast Harbor, 20 min from Bar Harbor. Immaculate hillside gardens above a serene pond. A quiet gem most tourists completely miss — especially beautiful in late May bloom.", url:"https://gardenpreserve.org/thuya-garden", source:"stacy"},
      {actEmoji:"📚", group:"Nature & Culture", name:"Sherman's Books & Stationery", note:"Best bookstore in Bar Harbor. Excellent local Maine section, great gifts. Hard to leave empty-handed.", url:"https://shermans.com", source:"stacy"},
      {actEmoji:"🎵", group:"Nature & Culture", name:"The Annex", note:"Bar with live music most nights in season. Good spot to end any evening — especially after a long hike day when dinner is done and no one wants to sleep yet.", url:"https://www.facebook.com/theannexbarharbor", source:"stacy"},
    ],
    alerts:[
      {type:"warning", text:"🚗 Cadillac Summit Road requires a vehicle reservation via Recreation.gov (May 21–Oct 25). Opens 2 days prior at 10am EST. Set a reminder — or just hike up on foot. No reservation needed for hikers."},
      {type:"info", text:"🥾 Late May = end of mud season. Expect wet/muddy trails especially at lower elevations. Waterproof hiking boots are not optional."},
      {type:"tip", text:"🎟️ Buy an America the Beautiful National Parks Pass ($80) before you go. Covers Acadia's $35 entrance fee plus every other national park for a year."},
    ]
  },

  {
    id:"swh", city:"Southwest Harbor", dates:"May 27–29", emoji:"⚓", accent:"#7B3F2B", summary:"The decompression leg — quieter, slower, and just as good. Southwest Harbor is the local side of MDI: no tour buses, real Maine character. The Claremont is exceptional. Hike Acadia Mountain or Beech Mountain in the afternoon, Bass Harbor Lighthouse at golden hour, dinner at Little Fern. Flight out of Bangor on Friday — Stacy's group leaves by 10:30am, you're on the 2:22pm.",
    lat:44.2790, lon:-68.3259, wStart:"2026-05-27", wEnd:"2026-05-29",
    hotel:"The Claremont Hotel — Phillips House King w/ Deck",
    hotelUrl:"https://www.theclaremonthotel.com/",
    hotelAddr:"22 Claremont Rd, Southwest Harbor, ME 04679",
    hotelNote:"Historic 1883 Victorian inn, fully renovated 2021. Phillips House room features a gas fireplace and a private deck with partial Somes Sound views. Botanica Spa on-site, private dock, and the best restaurant on the quiet side of the island downstairs. Book the spa before you leave home.",
    friendHotel:"The Claremont Hotel — Ocean View 1BR Cottage",
    friendHotelUrl:"https://www.theclaremonthotel.com/",
    friendHotelAddr:"22 Claremont Rd, Southwest Harbor, ME 04679",
    friendHotelNote:"Private 1BR cottage on the Claremont grounds, directly on Somes Sound. Full kitchen, water-facing deck, complete separation from the main inn. Quiet, secluded, and exceptional — the best accommodation on this leg by a wide margin.",
    bookings:[
      { icon:"🚗", label:"Rental Car Drop-Off — Avis at BGR",
        lines:["Full-Size SUV return","📍 287 Godfrey Blvd, Bangor, ME 04401 (Bangor Intl Airport)","⏰ Allow ~30 min from The Claremont — plan checkout accordingly."],
        addr:"287 Godfrey Blvd, Bangor, ME 04401"
      },
      { icon:"✈️", label:"Return Flights — Jeremy & Jennie",
        flights:[
          {key:"AA1463", num:"AA 1463", airline:"American Airlines", route:"BGR → CLT", dep:"2:22 PM", arr:"5:17 PM", date:"May 29", trackingUrl:"https://flightaware.com/live/flight/AAL1463"}
        ]
      },
      { icon:"✈️", label:"Return Flights — Stacy, Justin & Ford",
        flights:[
          {key:"DL5254", num:"DL 5254", airline:"Delta", route:"BGR → LGA", dep:"12:15 PM", arr:"1:57 PM", date:"May 29", trackingUrl:"https://flightaware.com/live/flight/DAL5254"}
        ]
      },
    ],
    itinerary:[
      {
        date:"Thursday · May 28", label:"Relaxation Day", emoji:"🧘",
        items:[
          {time:"Morning", text:"Sleep in. Breakfast on your deck overlooking Somes Sound. This is the decompression leg of the trip — slow down and actually mean it."},
          {time:"Mid-Morning", text:"Botanica Spa at The Claremont · book a massage before you arrive · after three days of Acadia hiking, your body will demand it · walk-ins are unlikely during Memorial Day weekend", alert:true},
          {time:"Noon", text:"Lunch at Batson River Fish Camp · lobster rolls on The Claremont's private dock · cold drinks, water right there · perfect"},
          {time:"Afternoon", text:"Acadia Mountain Trail (2.5 mi RT, steep, outstanding Somes Sound views from the top) or Beech Mountain + Fire Tower for 360° views — pick one, both are great"},
          {time:"Golden Hour", text:"Bass Harbor Head Lighthouse · 15 min drive · one of the most photographed shots on the East Coast · arrive early to claim a spot on the rocks below"},
          {time:"Early Evening", text:"Pre-dinner drinks at Harry's Bar at The Claremont · classic cocktails · the right way to end every day here"},
          {time:"Evening", text:"Dinner at Little Fern at The Claremont · panoramic Somes Sound views · fireplace · reserve before you leave home", bookNow:true, bookingUrl:"https://resy.com/cities/southwest-harbor-me/venues/little-fern"},
        ]
      },
      {
        date:"Friday · May 29", label:"Travel Home", emoji:"✈️",
        items:[
          {time:"Morning", text:"Final breakfast · last coffee on the deck · pack and say a proper goodbye to Somes Sound"},
          {time:"Mid-Morning", text:"Check out of The Claremont"},
          {time:"~10:30 AM", text:"Drive to Bangor Airport · ~30 min · return Avis SUV at BGR · Stacy/Justin/Ford depart earlier for their 12:15 PM flight", confirmed:true},
          {time:"12:15 PM ✈️", text:"DL 5254 departs BGR → LGA — Stacy, Justin & Ford (CONFIRMED)", confirmed:true},
          {time:"2:22 PM ✈️", text:"AA 1463 departs BGR → CLT — Jeremy & Jennie (CONFIRMED)", confirmed:true},
          {time:"Afternoon", text:"Land in Charlotte · trip complete · go eat a mediocre dinner and miss Maine immediately 🦞"},
        ]
      }
    ],
    restaurants:[
      {name:"Little Fern at The Claremont", price:"$$$$", typeEmoji:"🍽️", type:"Fine Dining", must:true, rating:4.7, url:"https://theclaremonthotel.com/dining", note:"Best restaurant on this side of the island. Panoramic Somes Sound views, fireplace, exceptional food. Reserve before you leave home — don't try to walk in.", source:"guide"},
      {name:"Batson River Fish Camp", price:"$$", typeEmoji:"⚓", type:"Casual Dock Dining", must:true, rating:4.5, url:"https://theclaremonthotel.com/dining", note:"Right on The Claremont's private dock. Lobster rolls, cold drinks, on the water. Perfect lunch every day you're here.", source:"guide"},
      {name:"Harry's Bar at The Claremont", price:"$$", typeEmoji:"🍹", type:"Bar", must:false, rating:4.4, url:"https://theclaremonthotel.com/dining", note:"Where the evening starts. Classic cocktails, great atmosphere. Pre-dinner drinks here every night.", source:"guide"},
    ],
    activities:[
      {actEmoji:"🗼", name:"Bass Harbor Head Lighthouse", note:"15 min from Southwest Harbor. One of the most photographed lighthouses on the East Coast — set dramatically into rocky shoreline. Go at golden hour. Arrive early to claim a spot on the rocks below.", url:"https://www.nps.gov/acad/planyourvisit/bass-harbor-head-lighthouse.htm", source:"guide"},
      {actEmoji:"🥾", name:"Acadia Mountain Trail", note:"Short (2.5 mi RT), steep, and the views of Somes Sound from the summit are outstanding. Perfect final hike before a relaxed dinner.", url:"https://www.alltrails.com/trail/us/maine/acadia-mountain-trail", source:"guide"},
      {actEmoji:"🥾", name:"Beech Mountain + Fire Tower", note:"Great moderate hike on the quiet western side of the island. Far fewer crowds than the Bar Harbor side. Fire tower at the top with 360° views of the island.", url:"https://www.alltrails.com/trail/us/maine/beech-mountain-loop-trail", source:"guide"},
      {actEmoji:"💆", name:"Botanica Spa at The Claremont", note:"Book a massage before you arrive. After 3 days of Acadia hiking, your legs will demand it. Walk-ins are unlikely to work during Memorial Day weekend.", url:"https://theclaremonthotel.com/spa", source:"guide"},
    ],
    alerts:[
      {type:"warning", text:"✈️ Two flights out of BGR on May 29. DL 5254 (Stacy/Justin/Ford) departs 12:15 PM. AA 1463 (Jeremy & Jennie) departs 2:22 PM. The Claremont is ~30 min from BGR. Stacy's group needs to leave by 10:30am. Plan checkout accordingly."},
    ]
  }
];

// ── API Functions ─────────────────────────────────────────────

async function fetchWeatherForStop(s: typeof stops[0]) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=" + s.wStart + "&end_date=" + s.wEnd;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error || !d.daily?.time?.length) return null;
    return d.daily;
  } catch { return null; }
}

async function fetchFlightStatuses(
  setStatus: (m: Record<string,any>) => void,
  setLoading: (b: boolean) => void,
  setUpdated: (d: Date) => void
) {
  setLoading(true);
  const sysPrompt = "You are a flight status assistant. Search for the current real-time status of each flight. Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each element must include: {\"key\":\"\",\"status\":\"On Time|Delayed|Cancelled|Scheduled\",\"actualDep\":\"\",\"actualArr\":\"\",\"gate\":\"\",\"terminal\":\"\",\"delayMin\":0}. If real-time data is unavailable use status Scheduled and empty strings for actual times.";
  const flights = [
    {key:"WN351",  flight:"Southwest WN351",         route:"Charlotte CLT to Baltimore BWI",           date:"May 22 2026", schedDep:"8:20 AM",  schedArr:"9:50 AM"},
    {key:"WN2365", flight:"Southwest WN2365",         route:"Baltimore BWI to Portland Maine PWM",      date:"May 22 2026", schedDep:"10:40 AM", schedArr:"12:10 PM"},
    {key:"AA1463", flight:"American Airlines AA1463", route:"Bangor BGR to Charlotte CLT",              date:"May 29 2026", schedDep:"2:22 PM",  schedArr:"5:17 PM"},
    {key:"DL5254", flight:"Delta DL5254",             route:"Bangor BGR to New York LaGuardia LGA",     date:"May 29 2026", schedDep:"12:15 PM", schedArr:"1:57 PM"},
  ];
  const userMsg = "Get current status for these flights and return a JSON array only: " + JSON.stringify(flights);
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        system:sysPrompt,
        messages:[{role:"user",content:userMsg}]
      })
    });
    const data = await resp.json();
    const txt = (data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>b.text).join("");
    const arr = JSON.parse(txt.replace(/```json|```/g,"").trim());
    const map: Record<string,any> = {};
    arr.forEach((f:any) => { map[f.key] = f; });
    setStatus(map);
  } catch(e) { setStatus({}); }
  setLoading(false);
  setUpdated(new Date());
}

// ── Sub-components ────────────────────────────────────────────

function AlertBox({type, text}: {type:string, text:string}) {
  const s = ({warning:{bg:"#FFF8E7",bd:"#E8A020"},info:{bg:"#EBF4F8",bd:"#2D6A8F"},tip:{bg:"#EDFAF1",bd:"#1B7A4A"}}as any)[type]||{bg:"#EBF4F8",bd:"#2D6A8F"};
  return <div style={{background:s.bg,borderLeft:"4px solid "+s.bd,borderRadius:"0 8px 8px 0",padding:"12px 16px",marginBottom:"10px",fontSize:"0.87rem",lineHeight:1.55,color:"#2a2a2a"}}>{text}</div>;
}

function SecHead({color, label}: {color:string, label:string}) {
  return <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
    <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</div>
    <div style={{flex:1,height:"1px",background:color+"30"}}/>
  </div>;
}

function StarRating({rating}: {rating:number}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"2px",fontSize:"0.72rem"}}>
    {[1,2,3,4,5].map(i=>(
      <span key={i} style={{color:i<=full?"#F59E0B":(i===full+1&&half?"#F59E0B":"#ddd"),fontSize:"0.75rem"}}>
        {i<=full?"★":(i===full+1&&half?"⯨":"★")}
      </span>
    ))}
    <span style={{color:"#888",marginLeft:"3px",fontFamily:"Georgia,serif"}}>{rating}</span>
  </span>;
}

function PriceBadge({price}: {price:string}) {
  const n = (price||"").length;
  return <span style={{display:"inline-flex",letterSpacing:"0.01em",fontSize:"0.8rem"}}>
    {[1,2,3,4].map(i=><span key={i} style={{color:i<=n?"#2A7A47":"#ddd",fontWeight:i<=n?"600":"normal"}}>$</span>)}
  </span>;
}

function HotelCard({accent, label, hotel, hotelUrl, hotelAddr, note, secondary, hotelConfirmation}: any) {
  return <div style={{background:secondary?"#FAFAF7":"#fff",border:"1px solid "+accent+(secondary?"20":"30"),borderLeft:"5px solid "+(secondary?accent+"70":accent),borderRadius:"0 12px 12px 0",padding:"18px 22px"}}>
    <div style={{fontSize:"0.68rem",letterSpacing:"0.22em",textTransform:"uppercase",color:secondary?"#888":accent,marginBottom:"6px"}}>{label}</div>
    {hotelUrl
      ? <a href={hotelUrl} target="_blank" rel="noopener noreferrer" style={{fontWeight:"bold",fontSize:"1rem",marginBottom:"4px",color:secondary?"#444":"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #bbb",display:"inline-block"}}>{hotel}</a>
      : <div style={{fontWeight:"bold",fontSize:"1rem",marginBottom:"4px",color:secondary?"#444":"#1a1a1a"}}>{hotel}</div>
    }
    {hotelAddr&&<a href={appleMaps(hotelAddr)} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"0.78rem",color:secondary?"#999":accent,textDecoration:"none",marginBottom:"6px",opacity:0.85,marginTop:"4px"}}>📍 {hotelAddr} <span style={{fontSize:"0.7rem",opacity:0.6}}>· Maps</span></a>}
    {hotelConfirmation&&<div style={{fontSize:"0.72rem",color:"#999",marginBottom:"6px",letterSpacing:"0.02em"}}>🎫 Confirmation: <span style={{fontWeight:"bold",color:"#555"}}>{hotelConfirmation}</span></div>}
    <div style={{color:"#666",fontSize:"0.86rem",lineHeight:1.6,fontStyle:"italic",marginTop:"6px"}}>{note}</div>
  </div>;
}

function StatusBadge({status}: {status:string}) {
  const cfg = ({"On Time":{bg:"#EDFAF1",color:"#1B7A4A",dot:"#1B7A4A"},"Delayed":{bg:"#FFF8E7",color:"#b07010",dot:"#E8A020"},"Cancelled":{bg:"#FEF2F2",color:"#b91c1c",dot:"#ef4444"},"Scheduled":{bg:"#EBF4F8",color:"#2D6A8F",dot:"#2D6A8F"}}as any)[status]||{bg:"#f5f5f5",color:"#888",dot:"#aaa"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,color:cfg.color,fontSize:"0.7rem",fontWeight:"bold",padding:"2px 9px",borderRadius:"20px",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>{status}
  </span>;
}

function FlightRow({f, sMap, loading}: any) {
  const s = sMap?.[f.key];
  const delayed = s?.delayMin > 0;
  const actualDep = s?.actualDep && s.actualDep !== f.dep ? s.actualDep : null;
  const actualArr = s?.actualArr && s.actualArr !== f.arr ? s.actualArr : null;
  return <div style={{borderTop:"1px solid #f0ede6",paddingTop:"11px",marginTop:"11px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
        {f.trackingUrl
          ? <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" style={{fontWeight:"bold",fontSize:"0.96rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #aaa"}}>{f.num}</a>
          : <span style={{fontWeight:"bold",fontSize:"0.96rem"}}>{f.num}</span>
        }
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.airline}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#666",fontSize:"0.82rem"}}>{f.route}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.date}</span>
      </div>
      {loading?<span style={{fontSize:"0.72rem",color:"#aaa"}}>Checking…</span>:s&&<StatusBadge status={s.status||"Unknown"}/>}
    </div>
    <div style={{display:"flex",gap:"20px",flexWrap:"wrap",alignItems:"flex-end"}}>
      {[["Departs",f.dep,actualDep],["Arrives",f.arr,actualArr]].map(([lbl,sched,actual])=>(
        <div key={lbl as string}>
          <div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>{lbl}</div>
          <div style={{fontWeight:"bold",fontSize:"0.9rem",display:"flex",alignItems:"center",gap:"5px"}}>
            {actual?<><span style={{textDecoration:"line-through",color:"#ccc",fontWeight:"normal",fontSize:"0.8rem"}}>{sched as string}</span><span style={{color:delayed?"#b07010":"#1B7A4A"}}>{actual}</span></>:sched}
          </div>
        </div>
      ))}
      {s?.gate&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Gate</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#1a1a1a"}}>{s.gate||"TBD"}</div></div>}
      {!s&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Gate</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#bbb"}}>TBD</div></div>}
      {s?.terminal&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Terminal</div><div style={{fontWeight:"bold",fontSize:"0.9rem"}}>{s.terminal}</div></div>}
      {delayed&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Delay</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#b07010"}}>+{s.delayMin} min</div></div>}
    </div>
  </div>;
}

function BookingCard({booking, accent, flightStatus, flightLoading}: any) {
  return <div style={{background:"#fff",border:"1px solid "+accent+"25",borderRadius:"10px",padding:"15px 18px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
    <div style={{fontSize:"1.3rem",lineHeight:1,marginTop:"2px",flexShrink:0}}>{booking.icon}</div>
    <div style={{flex:1}}>
      {/* Label with Avis in brand red */}
      <div style={{fontWeight:"bold",color:"#777",fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"}}>
        {booking.label.includes("Avis") ? (() => {
          const parts = booking.label.split("Avis");
          return <>{parts[0]}<span style={{color:"#CC2200"}}>Avis</span>{parts[1]}</>;
        })() : booking.label}
      </div>
      {booking.flights?.map((f:any,i:number)=><FlightRow key={i} f={f} sMap={flightStatus} loading={flightLoading}/>)}
      {booking.lines?.map((l:string,i:number)=>{
        const isAddr=l.startsWith("📍");
        return <div key={i} style={{fontSize:"0.86rem",lineHeight:1.6,marginBottom:"2px",fontWeight:i===0?"600":"normal",color:l.startsWith("⏰")||l.startsWith("📅")?"#666":"#222"}}>
          {isAddr&&booking.addr?<a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{color:accent,textDecoration:"none"}}>📍 {l.replace("📍","").trim()} <span style={{fontSize:"0.7rem",opacity:0.7}}>· Open in Maps</span></a>:l}
        </div>;
      })}
      {booking.confirmationLink&&(
        <div style={{fontSize:"0.86rem",lineHeight:1.6,marginTop:"2px"}}>
          <a href={booking.confirmationLink.url} target="_blank" rel="noopener noreferrer"
            style={{color:accent,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"6px"}}>
            🎫 {booking.confirmationLink.label}
            <span style={{fontSize:"0.72rem",opacity:0.7}}>· View Reservation</span>
          </a>
        </div>
      )}
    </div>
  </div>;
}

function LegSummary({stop}: any) {
  if (!stop.summary) return null;
  return (
    <div style={{background:stop.accent+"0D",borderLeft:"4px solid "+stop.accent,borderRadius:"0 10px 10px 0",padding:"14px 18px",marginBottom:"22px"}}>
      <div style={{fontSize:"0.68rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"6px"}}>{stop.emoji} {stop.city} · {stop.dates}</div>
      <div style={{fontSize:"0.88rem",color:"#3a3a3a",lineHeight:1.65,fontStyle:"italic"}}>{stop.summary}</div>
    </div>
  );
}

function WeatherStrip({stop, weatherData}: any) {
  const data = weatherData[stop.id];
  const tripStart = new Date(stop.wStart+"T12:00:00");
  const today = new Date();
  const daysOut = Math.ceil((tripStart.getTime()-today.getTime())/(1000*60*60*24));
  const availDate = new Date(tripStart.getTime()-15*24*60*60*1000).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  return <div style={{marginBottom:"22px"}}>
    <div style={{fontSize:"0.72rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"9px"}}>🌤️ Forecast — {stop.city}</div>
    {!data?(
      <div style={{background:stop.accent+"08",border:"1px dashed "+stop.accent+"30",borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"1.6rem"}}>📅</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:"0.85rem",color:"#444"}}>Forecast not yet available</div>
          <div style={{fontSize:"0.8rem",color:"#888",marginTop:"2px"}}>{daysOut>16?"Opens around "+availDate+" — will auto-populate on refresh.":"Loading weather data…"}</div>
        </div>
      </div>
    ):(
      <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
        {data.time.map((dt:string,i:number)=>{
          const d=new Date(dt+"T12:00:00");
          const w=wmo(data.weathercode[i]);
          const hi=Math.round(data.temperature_2m_max[i]);
          const lo=Math.round(data.temperature_2m_min[i]);
          const precip=data.precipitation_probability_max[i];
          return <div key={i} style={{flex:"0 0 auto",minWidth:"84px",background:"#fff",border:"1px solid "+stop.accent+"22",borderRadius:"12px",padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 5px "+stop.accent+"0D"}}>
            <div style={{fontSize:"0.68rem",fontWeight:"bold",color:"#888",letterSpacing:"0.06em"}}>{DAYS[d.getDay()]}</div>
            <div style={{fontSize:"0.68rem",color:"#ccc",marginBottom:"7px"}}>{d.getMonth()+1}/{d.getDate()}</div>
            <div style={{fontSize:"1.6rem",lineHeight:1,marginBottom:"5px"}}>{w.e}</div>
            <div style={{fontSize:"0.68rem",color:"#aaa",marginBottom:"5px"}}>{w.d}</div>
            <div style={{fontWeight:"bold",fontSize:"0.88rem",color:"#333"}}>{hi}°<span style={{fontWeight:"normal",color:"#bbb",fontSize:"0.78rem"}}> {lo}°</span></div>
            <div style={{fontSize:"0.7rem",color:precip>50?"#2D6A8F":"#ccc",marginTop:"4px",fontWeight:precip>50?"bold":"normal"}}>💧{precip}%</div>
          </div>;
        })}
      </div>
    )}
  </div>;
}

function RestaurantCard({r, accent}: any) {
  return (
    <div style={{background:"#fff",borderRadius:"10px",padding:"15px 18px",border:"1px solid "+(r.must?accent+"40":"#e0ddd6"),display:"flex",gap:"13px",alignItems:"flex-start",boxShadow:r.must?"0 2px 10px "+accent+"12":"none"}}>
      {r.must
        ?<div style={{background:accent,color:"#fff",fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",padding:"3px 7px",borderRadius:"4px",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0}}>Must</div>
        :<div style={{width:"36px",flexShrink:0}}/>
      }
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap",marginBottom:"3px"}}>
          <span style={{fontSize:"1.1rem",lineHeight:1,flexShrink:0}}>{r.typeEmoji||"🍽️"}</span>
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            style={{fontWeight:"bold",fontSize:"0.98rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #bbb"}}>
            {r.name}
          </a>
          <span style={{fontSize:"0.76rem",color:"#999",fontStyle:"italic"}}>{r.type}</span>
          {r.source==="stacy"&&<span style={{fontSize:"0.6rem",background:"#F3EDF7",color:"#7B4FA6",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em"}}>Stacy's Find</span>}
          {r.flag&&<span style={{fontSize:"0.6rem",background:"#FFF8E7",color:"#b07010",padding:"1px 7px",borderRadius:"10px",border:"1px solid #E8A02040"}}>⚠ {r.flag}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px",flexWrap:"wrap"}}>
          <StarRating rating={r.rating}/>
          <PriceBadge price={r.price}/>
        </div>
        <div style={{color:"#555",fontSize:"0.86rem",lineHeight:1.55}}>{r.note}</div>
      </div>
    </div>
  );
}

function RestaurantList({restaurants, accent}: any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
      {restaurants.map((r:any,i:number)=><RestaurantCard key={i} r={r} accent={accent}/>)}
    </div>
  );
}

function ActivityCard({a, accent}: any) {
  return (
    <div style={{background:"#fff",borderRadius:"10px",padding:"14px 18px",border:"1px solid #e0ddd6",display:"flex",gap:"13px",alignItems:"flex-start"}}>
      <div style={{fontSize:"1.2rem",flexShrink:0,lineHeight:1,marginTop:"1px",width:"22px",textAlign:"center"}}>{a.actEmoji||"📍"}</div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap",marginBottom:"3px"}}>
          <a href={a.url} target="_blank" rel="noopener noreferrer"
            style={{fontWeight:"bold",fontSize:"0.94rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #bbb"}}>
            {a.name}
          </a>
          {a.source==="stacy"&&<span style={{fontSize:"0.6rem",background:"#F3EDF7",color:"#7B4FA6",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em"}}>Stacy's Find</span>}
          {a.alltrailsUrl&&<a href={a.alltrailsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"0.6rem",background:"#E8F5E9",color:"#2E7D32",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em",textDecoration:"none",border:"1px solid #A5D6A730",display:"inline-flex",alignItems:"center",gap:"3px"}}>🌿 AllTrails</a>}
        </div>
        <div style={{color:"#555",fontSize:"0.86rem",lineHeight:1.55,marginTop:"3px"}}>{a.note}</div>
      </div>
    </div>
  );
}

function ActivityList({activities, accent}: any) {
  // Group activities if they have a group field (Bar Harbor)
  const hasGroups = activities.some((a:any)=>a.group);
  if (!hasGroups) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {activities.map((a:any,i:number)=><ActivityCard key={i} a={a} accent={accent}/>)}
      </div>
    );
  }
  // Build ordered groups
  const groupOrder = ["Hikes","On the Water","Walks & Views","Nature & Culture"];
  const grouped: Record<string,any[]> = {};
  const groupEmojis: Record<string,string> = {"Hikes":"🥾","On the Water":"⛵","Walks & Views":"🚶","Nature & Culture":"🌿"};
  activities.forEach((a:any)=>{
    const g = a.group||"Other";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(a);
  });
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {groupOrder.filter(g=>grouped[g]?.length).map(g=>(
        <div key={g}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
            <span style={{fontSize:"1rem"}}>{groupEmojis[g]||"📍"}</span>
            <div style={{fontWeight:"bold",color:accent,fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{g}</div>
            <div style={{flex:1,height:"1px",background:accent+"20"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {grouped[g].map((a:any,i:number)=><ActivityCard key={i} a={a} accent={accent}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({color, label, open, onToggle, children, rightSlot}: any) {
  return (
    <div style={{marginBottom:"28px"}}>
      <button onClick={onToggle} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",marginBottom: open ? "12px" : "0",fontFamily:"Georgia,serif"}}>
        <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</div>
        <div style={{flex:1,height:"1px",background:color+"30"}}/>
        {rightSlot}
        <span style={{color,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
      </button>
      {open && children}
    </div>
  );
}

function DailyItinerary({stop}: any) {
  const [openDay, setOpenDay] = useState(0);
  const LS_KEY = "jernie_confirmed_" + stop.id;
  const [userConfirmed, setUserConfirmed] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch { return {}; }
  });
  const toggleConfirm = (key: string) => {
    setUserConfirmed(prev => {
      const next = {...prev, [key]: !prev[key]};
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return (
    <div style={{marginBottom:"28px"}}>
      <SecHead color={stop.accent} label="📅 Daily Itinerary — Loose Plan"/>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {stop.itinerary.map((day:any,di:number)=>(
          <div key={di} style={{border:"1px solid "+stop.accent+(openDay===di?"40":"20"),borderRadius:"12px",overflow:"hidden",background:"#fff",transition:"border-color 0.15s"}}>
            <button onClick={()=>setOpenDay(openDay===di?-1:di)}
              style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px",background:openDay===di?stop.accent+"0A":"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",transition:"background 0.15s"}}>
              <span style={{fontSize:"1.25rem",flexShrink:0}}>{day.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:"0.92rem",color:"#1a1a1a"}}>{day.date}</div>
                <div style={{fontSize:"0.75rem",color:"#888",marginTop:"2px",fontStyle:"italic"}}>{day.label}</div>
              </div>
              <span style={{color:stop.accent,fontSize:"0.75rem",display:"inline-block",transform:openDay===di?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▼</span>
            </button>
            {openDay===di&&(
              <div style={{padding:"0 18px 14px 18px",borderTop:"1px solid "+stop.accent+"15"}}>
                {day.items.map((item:any,ii:number)=>{
                  const ck = di+"_"+ii;
                  const isConfirmed = item.confirmed || userConfirmed[ck];
                  return (
                  <div key={ii} style={{display:"flex",gap:"12px",padding:"10px 0",borderBottom:ii<day.items.length-1?"1px dashed #f0ede6":"none",alignItems:"flex-start"}}>
                    <div style={{minWidth:"96px",flexShrink:0,display:"flex",flexDirection:"column",gap:"5px",paddingTop:"2px"}}>
                      <div style={{fontSize:"0.7rem",color:"#aaa",lineHeight:1.4,fontStyle:"italic"}}>{item.time}</div>
                      {isConfirmed ? (
                        <button onClick={()=>!item.confirmed&&toggleConfirm(ck)}
                          title={item.confirmed?"Locked in":"Click to unmark"}
                          style={{background:stop.accent,color:"#fff",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",display:"inline-block",width:"fit-content",border:"none",cursor:item.confirmed?"default":"pointer",fontFamily:"Georgia,serif"}}>
                          ✓ Confirmed
                        </button>
                      ) : (
                        <>
                          {item.bookNow&&(
                            item.bookingUrl
                              ? <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer"
                                  style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 8px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content",textDecoration:"none",cursor:"pointer"}}>
                                  📅 Book Now
                                </a>
                              : <span style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content"}}>📅 Book Now</span>
                          )}
                          {item.alert&&!item.bookNow&&(
                            <span style={{background:"#FFF8E7",color:"#b07010",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #E8A02050",display:"inline-block",width:"fit-content"}}>⚠ Note</span>
                          )}
                          <button onClick={()=>toggleConfirm(ck)}
                            style={{background:"transparent",color:"#bbb",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px dashed #ddd",display:"inline-block",width:"fit-content",cursor:"pointer",fontFamily:"Georgia,serif",marginTop:"1px"}}>
                            + Confirm
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{fontSize:"0.86rem",color:"#333",lineHeight:1.55,flex:1,paddingTop:"2px"}}>
                      {item.text}
                      {item.addr&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={appleMaps(item.addr)} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:stop.accent,textDecoration:"none",fontStyle:"normal"}}>
                            📍 {item.addrLabel||item.addr} <span style={{fontSize:"0.68rem",opacity:0.7}}>· Maps</span>
                          </a>
                        </div>
                      )}
                      {item.tideUrl&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={item.tideUrl} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:"#2D6A8F",textDecoration:"none",fontStyle:"normal"}}>
                            🌊 Bar Harbor Tide Chart <span style={{fontSize:"0.68rem",opacity:0.7}}>· NOAA</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Countdown() {
  const t = useCountdown();
  if (!t) return (
    <p style={{margin:"16px auto 0",color:"#A8C4D4",fontSize:"1rem",fontStyle:"italic"}}>We're in Maine! 🦞</p>
  );
  return (
    <div style={{marginTop:"20px"}}>
      <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",color:"#7A9FB5",textTransform:"uppercase",marginBottom:"10px"}}>Countdown to Departure · May 22 · 8:20 AM</div>
      <div style={{display:"flex",justifyContent:"center",gap:"6px",flexWrap:"wrap"}}>
        {([["days",t.days],["hrs",t.hours],["min",t.mins],["sec",t.secs]] as [string,number][]).map(([label,val])=>(
          <div key={label} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:"10px",padding:"10px 14px",minWidth:"56px"}}>
            <div style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontWeight:"bold",color:"#FDFAF4",lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em"}}>{String(val).padStart(2,"0")}</div>
            <div style={{fontSize:"0.58rem",color:"#7A9FB5",letterSpacing:"0.15em",textTransform:"uppercase",marginTop:"4px"}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── What to Pack ──────────────────────────────────────────────────

const PACK_LISTS = [
  {
    category: "🥾 Hiking & Outdoors",
    items: [
      "Waterproof hiking boots (mandatory — mud season in late May)",
      "Hiking poles (optional but helpful on Beehive)",
      "Day pack / hydration pack",
      "Rain jacket or packable shell",
      "Base layer + mid layer (mornings are cold)",
      "Quick-dry hiking pants or shorts",
      "Wool or synthetic hiking socks (x3 pairs)",
      "Sunscreen SPF 50+",
      "Insect repellent",
      "Headlamp (for 4am Cadillac sunrise)",
      "Trekking gloves",
      "Water bottles or hydration bladder",
      "Trail snacks (bars, nuts)",
      "America the Beautiful Pass ($80 — covers Acadia)",
    ]
  },
  {
    category: "🎣 Lobster Boat / On the Water",
    items: [
      "Wind-resistant fleece or jacket (it's cold on the water)",
      "Grippy boat shoes or old sneakers",
      "Sunglasses with strap",
      "Hat with brim",
      "Camera or GoPro with extra storage",
    ]
  },
  {
    category: "🍽️ Dinners & Evenings Out",
    items: [
      "One smart-casual outfit (Scales, Havana, Little Fern)",
      "Dress pants or dark jeans (no hiking gear at dinner)",
      "Button-down or blouse",
      "Light sport coat or blazer (optional, not required)",
      "Comfortable but presentable shoes",
    ]
  },
  {
    category: "🏖️ City Days & Portland",
    items: [
      "Comfortable walking shoes or sneakers",
      "Light layers for city exploring",
      "Tote bag (for market, fish market, souvenirs)",
      "Reusable water bottle",
    ]
  },
  {
    category: "🧴 Toiletries & Health",
    items: [
      "Ibuprofen or Advil (legs will be sore after Acadia)",
      "Blister kit (moleskin + bandages)",
      "Hand sanitizer",
      "Chapstick with SPF",
      "Sunscreen (two bottles — you'll go through it)",
      "Any prescription medications",
      "Small first aid kit",
    ]
  },
  {
    category: "📱 Tech & Documents",
    items: [
      "Phone charger + backup battery pack",
      "Download offline Acadia trail maps (AllTrails or Gaia GPS)",
      "Screenshot or save recreation.gov reservation for Cadillac",
      "Avis confirmation: 08749981US2",
      "West Street Hotel confirmation: 3418815665-1",
      "Screenshot flight confirmations",
      "America the Beautiful Pass (buy before you leave)",
    ]
  },
];

function WhatToPack({accent}: any) {
  const LS_KEY = "jernie_pack";
  const [checked, setChecked] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch { return {}; }
  });
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = {...prev, [key]: !prev[key]};
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const totalItems = PACK_LISTS.reduce((a,c)=>a+c.items.length,0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div style={{marginBottom:"28px"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",marginBottom:open?"12px":"0",fontFamily:"Georgia,serif"}}>
        <div style={{fontWeight:"bold",color:accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>🎒 What to Pack</div>
        <div style={{flex:1,height:"1px",background:accent+"30"}}/>
        <span style={{fontSize:"0.7rem",color:"#999",whiteSpace:"nowrap",marginRight:"6px"}}>{checkedCount}/{totalItems} packed</span>
        <span style={{color:accent,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
      </button>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {PACK_LISTS.map((section,si)=>(
            <div key={si} style={{background:"#fff",borderRadius:"12px",border:"1px solid #e0ddd6",overflow:"hidden"}}>
              <div style={{background:accent+"0A",borderBottom:"1px solid "+accent+"15",padding:"10px 16px",fontWeight:"bold",fontSize:"0.8rem",color:accent,letterSpacing:"0.04em"}}>
                {section.category}
              </div>
              <div style={{padding:"6px 0"}}>
                {section.items.map((item,ii)=>{
                  const key = si+"_"+ii;
                  const done = !!checked[key];
                  return (
                    <button key={ii} onClick={()=>toggle(key)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"8px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",borderBottom:ii<section.items.length-1?"1px solid #f5f3ef":"none",transition:"background 0.1s"}}>
                      <div style={{width:"18px",height:"18px",borderRadius:"4px",border:"2px solid "+(done?accent:"#ccc"),background:done?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                        {done&&<span style={{color:"#fff",fontSize:"0.65rem",fontWeight:"bold"}}>✓</span>}
                      </div>
                      <span style={{fontSize:"0.84rem",color:done?"#bbb":"#333",textDecoration:done?"line-through":"none",lineHeight:1.4,transition:"all 0.15s"}}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {checkedCount > 0 && (
            <button onClick={()=>{
              setChecked({});
              try { localStorage.removeItem(LS_KEY); } catch {}
            }} style={{alignSelf:"flex-end",background:"transparent",border:"1px solid #e0ddd6",borderRadius:"6px",padding:"4px 12px",fontSize:"0.72rem",color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Reset list
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

// ── PIN Gate ─────────────────────────────────────────────────

const PIN = "0824";
const SESSION_KEY = "maine2026_unlocked";

function PinGate({onUnlock}: {onUnlock: ()=>void}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const entered = next.join("");
      if (entered === PIN) {
        setFlash(true);
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        setTimeout(onUnlock, 380);
      } else {
        setShake(true);
        setTimeout(() => { setDigits([]); setShake(false); }, 650);
      }
    }
  };

  const handleDelete = () => setDigits(d => d.slice(0,-1));

  const keys = [
    ["1",""],["2","ABC"],["3","DEF"],
    ["4","GHI"],["5","JKL"],["6","MNO"],
    ["7","PQRS"],["8","TUV"],["9","WXYZ"],
    null,["0",""],["DEL",""]
  ];

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"linear-gradient(170deg,#1a2a3a 0%,#0D2B3E 50%,#0a1f2e 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",
      opacity: flash ? 0 : 1,
      transition: flash ? "opacity 0.35s ease" : "none",
      fontFamily:"Georgia,'Times New Roman',serif",
    }}>

      {/* Face ID icon */}
      <div style={{fontSize:"2rem",marginBottom:"10px",opacity:0.5}}>🔒</div>

      {/* Title */}
      <div style={{color:"#FDFAF4",fontSize:"1.45rem",fontWeight:"normal",letterSpacing:"0.01em",marginBottom:"6px",textAlign:"center"}}>
        Enter Passcode to View
      </div>
      <div style={{color:"#7A9FB5",fontSize:"0.9rem",letterSpacing:"0.04em",marginBottom:"36px",fontStyle:"italic"}}>
        Happy Birthday Ford
      </div>

      {/* Dots */}
      <div style={{
        display:"flex",gap:"18px",marginBottom:"44px",
        animation: shake ? "pinShake 0.55s ease" : "none",
      }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            width:"13px",height:"13px",borderRadius:"50%",
            border:"2px solid rgba(255,255,255,0.5)",
            background: i < digits.length ? "#FDFAF4" : "transparent",
            transition:"background 0.15s",
          }}/>
        ))}
      </div>

      {/* Keypad */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"13px",width:"min(290px,80vw)"}}>
        {keys.map((k,i)=>{
          if (!k) return <div key={i}/>;
          const [num, letters] = k;
          const isDel = num === "DEL";
          return (
            <button key={i}
              onClick={()=> isDel ? handleDelete() : handleDigit(num)}
              style={{
                width:"100%",aspectRatio:"1",borderRadius:"50%",
                border:"none",cursor:"pointer",
                background: isDel ? "transparent" : "rgba(255,255,255,0.12)",
                backdropFilter:"blur(8px)",
                WebkitBackdropFilter:"blur(8px)",
                display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",
                color:"#FDFAF4",
                transition:"background 0.12s,transform 0.08s",
                fontFamily:"inherit",
              }}
              onMouseDown={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onMouseUp={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
              onTouchStart={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onTouchEnd={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
            >
              {isDel
                ? <span style={{fontSize:"1.1rem",opacity:0.7}}>⌫</span>
                : <>
                    <span style={{fontSize:"1.65rem",fontWeight:"300",lineHeight:1}}>{num}</span>
                    {letters && <span style={{fontSize:"0.5rem",letterSpacing:"0.18em",opacity:0.6,marginTop:"2px"}}>{letters}</span>}
                  </>
              }
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes pinShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(10px); }
          45%  { transform: translateX(-8px); }
          60%  { transform: translateX(8px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function MaineGuide() {
  const [unlocked, setUnlocked] = useState(()=>{
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  const [active, setActive] = useState("portland");
  const [weatherData, setWeatherData] = useState<Record<string,any>>({});
  const [flightStatus, setFlightStatus] = useState<Record<string,any>>({});
  const [flightLoading, setFlightLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date|null>(null);
  const [travelOpen, setTravelOpen] = useState(true);
  const [eatOpen, setEatOpen] = useState(true);
  const [doOpen, setDoOpen] = useState(true);
  const stop = stops.find(s=>s.id===active)!;
  const hasFlights = stop.bookings.some((b:any)=>b.flights);

  useEffect(()=>{
    stops.forEach(async s=>{
      const d = await fetchWeatherForStop(s);
      if(d) setWeatherData(prev=>({...prev,[s.id]:d}));
    });
    fetchFlightStatuses(setFlightStatus,setFlightLoading,setLastUpdated);
  },[]);

  useEffect(()=>{
    setTravelOpen(true);
    setEatOpen(true);
    setDoOpen(true);
  },[active]);

  return (
    <>
      {!unlocked && <PinGate onUnlock={()=>setUnlocked(true)}/>}
    <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",color:"#1a1a1a"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0D2B3E 0%,#1B4D6B 60%,#0D2B3E 100%)",padding:"52px 24px 44px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.04) 0%,transparent 50%)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.3em",color:"#A8C4D4",textTransform:"uppercase",marginBottom:"14px"}}>May 22 – 29, 2026</div>
          <h1 style={{margin:0,fontSize:"clamp(1.9rem,5vw,3.1rem)",fontWeight:"normal",color:"#FDFAF4",lineHeight:1.1,letterSpacing:"-0.01em"}}>Maine Coast Trip Guide</h1>
          <p style={{margin:"10px auto 0",maxWidth:"500px",color:"#7A9FB5",fontSize:"0.88rem",fontStyle:"italic"}}>Portland → Bar Harbor & Acadia → Southwest Harbor</p>
          <div style={{marginTop:"16px",display:"flex",justifyContent:"center",gap:"24px",flexWrap:"wrap"}}>
            {[["🦞","Seafood-focused"],["🏔️","Acadia hiking"],["🛏️","Boutique stays"]].map(([e,l])=>(
              <div key={l} style={{color:"#C8DDE8",fontSize:"0.8rem",letterSpacing:"0.04em"}}>{e} {l}</div>
            ))}
          </div>
          <Countdown/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid #D4C9B0",background:"#EDE8DC",overflowX:"auto"}}>
        {stops.map(s=>(
          <button key={s.id} onClick={()=>setActive(s.id)} style={{flex:"1 1 auto",minWidth:"110px",padding:"14px 16px",border:"none",background:active===s.id?"#F5F0E8":"transparent",borderBottom:active===s.id?"3px solid "+s.accent:"3px solid transparent",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:"0.88rem",color:active===s.id?s.accent:"#666",fontWeight:active===s.id?"bold":"normal",transition:"all 0.18s",textAlign:"center",lineHeight:1.3}}>
            <div style={{fontSize:"1.25rem"}}>{s.emoji}</div>
            <div>{s.city}</div>
            <div style={{fontSize:"0.72rem",opacity:0.65,marginTop:"2px"}}>{s.dates}</div>
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{maxWidth:"780px",margin:"0 auto",padding:"32px 20px 64px"}}>

        <LegSummary stop={stop}/>
        <WeatherStrip stop={stop} weatherData={weatherData}/>

        {/* Travel & Accommodations */}
        <CollapsibleSection
          color={stop.accent}
          label="✈️ Travel & Accommodations"
          open={travelOpen}
          onToggle={()=>setTravelOpen(v=>!v)}
          rightSlot={hasFlights&&(
            <button onClick={(e)=>{e.stopPropagation();fetchFlightStatuses(setFlightStatus,setFlightLoading,setLastUpdated);}} disabled={flightLoading}
              style={{background:"transparent",border:"1px solid "+stop.accent+"50",borderRadius:"6px",padding:"3px 10px",fontSize:"0.72rem",color:stop.accent,cursor:flightLoading?"default":"pointer",opacity:flightLoading?0.5:1,fontFamily:"Georgia,serif"}}>
              {flightLoading?"⏳ Checking…":"↻ Refresh"}
            </button>
          )}
        >
          {hasFlights&&lastUpdated&&<div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>Last checked: {lastUpdated.toLocaleTimeString()}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {stop.id==="swh" && <>
              <HotelCard accent={stop.accent} label="🏠 Jeremy & Jennie's Accommodations" hotel={stop.hotel} hotelUrl={stop.hotelUrl} hotelAddr={stop.hotelAddr} note={stop.hotelNote} hotelConfirmation={stop.hotelConfirmation}/>
              <HotelCard accent={stop.accent} label="🏠 Stacy, Justin & Ford's Accommodations" hotel={stop.friendHotel} hotelUrl={stop.friendHotelUrl} hotelAddr={stop.friendHotelAddr} note={stop.friendHotelNote} secondary/>
            </>}
            {stop.bookings.map((b:any,i:number)=><BookingCard key={i} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading}/>)}
            {stop.id!=="swh" && <>
              <HotelCard accent={stop.accent} label="🏠 Jeremy & Jennie's Accommodations" hotel={stop.hotel} hotelUrl={stop.hotelUrl} hotelAddr={stop.hotelAddr} note={stop.hotelNote} hotelConfirmation={stop.hotelConfirmation}/>
              <HotelCard accent={stop.accent} label="🏠 Stacy, Justin & Ford's Accommodations" hotel={stop.friendHotel} hotelUrl={stop.friendHotelUrl} hotelAddr={stop.friendHotelAddr} note={stop.friendHotelNote} secondary/>
            </>}
          </div>
        </CollapsibleSection>

        {/* Additional Details */}
        {stop.alerts.length>0&&(
          <div style={{marginBottom:"28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
              <div style={{fontWeight:"bold",color:stop.accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>📌 Additional Details</div>
              <div style={{flex:1,height:"1px",background:stop.accent+"30"}}/>
            </div>
            {stop.alerts.map((a:any,i:number)=><AlertBox key={i} {...a}/>)}
          </div>
        )}

        <DailyItinerary stop={stop}/>

        {/* Where to Eat */}
        {stop.id==="barharbor" ? (
          <CollapsibleSection color={stop.accent} label="🍽️ Where to Eat" open={eatOpen} onToggle={()=>setEatOpen(v=>!v)}>
            <RestaurantList restaurants={stop.restaurants} accent={stop.accent}/>
          </CollapsibleSection>
        ) : (
          <div style={{marginBottom:"28px"}}>
            <SecHead color={stop.accent} label="🍽️ Where to Eat"/>
            <RestaurantList restaurants={stop.restaurants} accent={stop.accent}/>
          </div>
        )}

        {/* What to Do */}
        {stop.id==="barharbor" ? (
          <CollapsibleSection color={stop.accent} label="📍 What to Do" open={doOpen} onToggle={()=>setDoOpen(v=>!v)}>
            <ActivityList activities={stop.activities} accent={stop.accent}/>
          </CollapsibleSection>
        ) : (
          <div style={{marginBottom:"28px"}}>
            <SecHead color={stop.accent} label="📍 What to Do"/>
            <ActivityList activities={stop.activities} accent={stop.accent}/>
          </div>
        )}

        {/* What to Pack */}
        <WhatToPack accent={stop.accent}/>
      </div>

      <div style={{background:"#0D2B3E",color:"#A8C4D4",textAlign:"center",padding:"22px",fontSize:"0.8rem",letterSpacing:"0.05em"}}>
        Maine Coast · May 2026 · 🌊
      </div>
    </div>
    </>
  );
}
