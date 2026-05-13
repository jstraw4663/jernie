// src/design/icons.ts
// Single source of truth for all icons. This is the ONLY file that imports
// from @phosphor-icons/react. To swap icon packs, change the Icons assignments
// below — nothing else in the codebase needs to change.

import {
  Airplane,
  AirplaneLanding,
  AirplaneTakeoff,
  Anchor,
  Bank,
  Barbell,
  Bathtub,
  BeerBottle,
  Bicycle,
  Building,
  Bus,
  CalendarBlank,
  CalendarDots,
  Car,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Compass,
  DoorOpen,
  Drop,
  Eye,
  ForkKnife,
  House,
  Key,
  MapPin,
  MapTrifold,
  Martini,
  PencilSimple,
  PersonSimpleHike,
  PersonSimpleWalk,
  Phone,
  Ruler,
  ShoppingBag,
  Snowflake,
  Sun,
  SunDim,
  SwimmingPool,
  Thermometer,
  Ticket,
  Timer,
  Umbrella,
  User,
  Waves,
  WifiHigh,
} from '@phosphor-icons/react';
import { TypeColors } from './tokens';

// ── Semantic icon variables ──────────────────────────────────────────────────
// Change these assignments to swap icon packs. Component code never changes.

export const Icons = {
  // Travel & Transport
  Flight:              Airplane,
  FlightTakeoff:       AirplaneTakeoff,
  FlightLanding:       AirplaneLanding,
  Car:                 Car,
  Bus:                 Bus,
  Walk:                PersonSimpleWalk,
  Bike:                Bicycle,
  Map:                 MapTrifold,
  Pin:                 MapPin,
  // Accommodation
  Hotel:               Building,
  Home:                House,
  Key:                 Key,
  DoorOpen:            DoorOpen,
  // Food & Drink
  Restaurant:          ForkKnife,
  Bar:                 BeerBottle,
  Cocktail:            Martini,
  // Amenities
  Wifi:                WifiHigh,
  Fitness:             Barbell,
  HotTub:              Bathtub,
  Pool:                SwimmingPool,
  // Activities & Nature
  Hike:                PersonSimpleHike,
  Theater:             Ticket,
  Museum:              Bank,
  Anchor:              Anchor,
  Sight:               Eye,
  Shop:                ShoppingBag,
  Beach:               Umbrella,
  Compass:             Compass,
  // UI Controls
  Phone:               Phone,
  User:                User,
  Edit:                PencilSimple,
  Ruler:               Ruler,
  Timer:               Timer,
  Calendar:            CalendarDots,
  CalendarBlank:       CalendarBlank,
  Drop:                Drop,
  Waves:               Waves,
  // Weather
  WeatherClear:        Sun,
  WeatherMostlyClear:  SunDim,
  WeatherPartlyCloudy: CloudSun,
  WeatherCloudy:       Cloud,
  WeatherFog:          CloudFog,
  WeatherRain:         CloudRain,
  WeatherSnow:         CloudSnow,
  WeatherHeavySnow:    Snowflake,
  WeatherStorm:        CloudLightning,
  WeatherThermometer:  Thermometer,
} as const;

export type IconName = keyof typeof Icons;
export type IconComponent = typeof Icons[IconName];

// ── Icon entry types ─────────────────────────────────────────────────────────
// Discriminated union — rendering via EntryIcon (src/design/EntryIcon.tsx).

export type IconEntry =
  | { kind: 'component'; Icon: IconComponent; color: string }
  | { kind: 'image';     src: string;         color: string };

// Convenience constructors
const ic  = (Icon: IconComponent, color: string): IconEntry => ({ kind: 'component', Icon, color });
const img = (src: string,         color: string): IconEntry => ({ kind: 'image', src, color });

// ── emoji → icon maps (values reference Icons.* — no Phosphor names here) ───

// emoji string from trip.json → icon + color  (consumed by PlaceIcon)
export const EMOJI_ICON_MAP: Record<string, IconEntry> = {
  '✈️': img('/icons/flight.png',   TypeColors.flight),
  '✈':  img('/icons/flight.png',   TypeColors.flight),
  '🚗': img('/icons/car.png',       TypeColors.car),
  '🗺️': ic(Icons.Map,              TypeColors.flight),
  '🗺':  ic(Icons.Map,              TypeColors.flight),
  '🚶': ic(Icons.Walk,             TypeColors.hike),
  '🚌': ic(Icons.Bus,              TypeColors.car),
  '🚲': ic(Icons.Bike,             TypeColors.hike),
  '🏨': img('/icons/hotel.png',    TypeColors.stay),
  '🏠': ic(Icons.Home,             TypeColors.stay),
  '🍽':  img('/icons/food.png',    TypeColors.food),
  '🍻': img('/icons/bar.png',      TypeColors.bars),
  '🍺': img('/icons/bar.png',      TypeColors.bars),
  '🥾': img('/icons/hike.png',     TypeColors.hike),
  '🎭': ic(Icons.Theater,          TypeColors.activity),
  '🏛':  ic(Icons.Museum,          TypeColors.activity),
  '⚓': img('/icons/anchor.png',   TypeColors.flight),
  '👁':  img('/icons/sight.png',   TypeColors.sight),
  '🛍':  img('/icons/shopping.png', TypeColors.shopping),
  '🏖':  ic(Icons.Beach,           TypeColors.hike),
  '✏':  ic(Icons.Compass,         TypeColors.activity),
  '🌿': ic(Icons.Compass,         TypeColors.hike),
  '⛵': img('/icons/anchor.png',   TypeColors.flight),
  '📍': ic(Icons.Pin,              TypeColors.flight),
  '🦞': img('/icons/lobster.png',  TypeColors.food),
};

// WMO weather emoji from wmo(code).e → icon + color  (consumed by WeatherIcon)
export const WEATHER_ICON_MAP: Record<string, IconEntry> = {
  '☀️': ic(Icons.WeatherClear,        '#E8A020'),
  '🌤️': ic(Icons.WeatherMostlyClear,  '#E8A020'),
  '⛅':  ic(Icons.WeatherPartlyCloudy, '#94A3B8'),
  '☁️': ic(Icons.WeatherCloudy,       '#94A3B8'),
  '🌫️': ic(Icons.WeatherFog,          '#94A3B8'),
  '🌦️': ic(Icons.WeatherRain,         '#60A5FA'),
  '🌧️': ic(Icons.WeatherRain,         '#60A5FA'),
  '🌨️': ic(Icons.WeatherSnow,         '#BAE6FD'),
  '❄️':  ic(Icons.WeatherHeavySnow,   '#BAE6FD'),
  '⛈️': ic(Icons.WeatherStorm,        '#7C3AED'),
  '🌡️': ic(Icons.WeatherThermometer,  '#94A3B8'),
};

// PlaceCategory string → icon + color  (replaces ITINERARY_CATEGORY_ICON + CUSTOM_CATEGORY_EMOJI)
export const CATEGORY_ICON_MAP: Record<string, IconEntry> = {
  restaurant: img('/icons/food.png',      TypeColors.food),
  bar:        img('/icons/bar.png',       TypeColors.bars),
  hike:       img('/icons/hike.png',      TypeColors.hike),
  sight:      img('/icons/sight.png',     TypeColors.sight),
  activity:   ic(Icons.Compass,           TypeColors.activity),
  attraction: ic(Icons.Theater,           TypeColors.activity),
  museum:     ic(Icons.Museum,            TypeColors.activity),
  beach:      ic(Icons.Beach,             TypeColors.hike),
  shop:       img('/icons/shopping.png',  TypeColors.shopping),
  travel:     img('/icons/flight.png',    TypeColors.flight),
  lodging:    img('/icons/hotel.png',     TypeColors.stay),
  leisure:    ic(Icons.Beach,             TypeColors.hike),
  other:      ic(Icons.Compass,           TypeColors.activity),
};

// Activity group name → icon + color  (replaces groupEmojis in PlaceList)
export const PLACE_GROUP_ICON_MAP: Record<string, IconEntry> = {
  'Hikes':            img('/icons/hike.png',      TypeColors.hike),
  'On the Water':     img('/icons/anchor.png',    TypeColors.flight),
  'Walks & Views':    img('/icons/mountains.png', TypeColors.hike),
  'Nature & Culture': ic(Icons.Compass,           TypeColors.hike),
};
