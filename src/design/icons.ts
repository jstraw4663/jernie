// src/design/icons.ts
// Single source of truth for all icons. This is the ONLY file that imports
// from @phosphor-icons/react. To swap icon packs, change the Icons assignments
// below — nothing else in the codebase needs to change.

import {
  Airplane,
  Anchor,
  Bank,
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
  PencilSimple,
  PersonSimpleHike,
  PersonSimpleWalk,
  Phone,
  Ruler,
  ShoppingBag,
  Snowflake,
  Sun,
  SunDim,
  Thermometer,
  Ticket,
  Timer,
  Umbrella,
  User,
  Waves,
} from '@phosphor-icons/react';
import { IconColors } from './tokens';

// ── Semantic icon variables ──────────────────────────────────────────────────
// Change these assignments to swap icon packs. Component code never changes.

export const Icons = {
  // Travel & Transport
  Flight:              Airplane,
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
export type IconEntry = { Icon: IconComponent; color: string };

// ── emoji → icon maps (values reference Icons.* — no Phosphor names here) ───

// emoji string from trip.json → icon + color  (consumed by PlaceIcon)
export const EMOJI_ICON_MAP: Record<string, IconEntry> = {
  '✈️': { Icon: Icons.Flight,      color: IconColors.travel },
  '✈':  { Icon: Icons.Flight,      color: IconColors.travel },
  '🚗': { Icon: Icons.Car,         color: IconColors.travel },
  '🗺️': { Icon: Icons.Map,         color: IconColors.travel },
  '🗺':  { Icon: Icons.Map,         color: IconColors.travel },
  '🚶': { Icon: Icons.Walk,        color: IconColors.nature },
  '🚌': { Icon: Icons.Bus,         color: IconColors.travel },
  '🚲': { Icon: Icons.Bike,        color: IconColors.nature },
  '🏨': { Icon: Icons.Hotel,       color: IconColors.accommodation },
  '🏠': { Icon: Icons.Home,        color: IconColors.accommodation },
  '🍽':  { Icon: Icons.Restaurant, color: IconColors.food },
  '🍻': { Icon: Icons.Bar,         color: IconColors.food },
  '🍺': { Icon: Icons.Bar,         color: IconColors.food },
  '🥾': { Icon: Icons.Hike,        color: IconColors.nature },
  '🎭': { Icon: Icons.Theater,     color: IconColors.activity },
  '🏛':  { Icon: Icons.Museum,     color: IconColors.activity },
  '⚓': { Icon: Icons.Anchor,      color: IconColors.travel },
  '👁':  { Icon: Icons.Sight,      color: IconColors.activity },
  '🛍':  { Icon: Icons.Shop,       color: IconColors.shopping },
  '🏖':  { Icon: Icons.Beach,      color: IconColors.nature },
  '✏':  { Icon: Icons.Compass,    color: IconColors.activity },
  '🌿': { Icon: Icons.Compass,    color: IconColors.nature },
  '⛵': { Icon: Icons.Anchor,      color: IconColors.travel },
  '📍': { Icon: Icons.Pin,         color: IconColors.travel },
};

// WMO weather emoji from wmo(code).e → icon + color  (consumed by WeatherIcon)
export const WEATHER_ICON_MAP: Record<string, IconEntry> = {
  '☀️': { Icon: Icons.WeatherClear,        color: IconColors.weatherClear },
  '🌤️': { Icon: Icons.WeatherMostlyClear,  color: IconColors.weatherClear },
  '⛅':  { Icon: Icons.WeatherPartlyCloudy, color: IconColors.weatherCloud },
  '☁️': { Icon: Icons.WeatherCloudy,       color: IconColors.weatherCloud },
  '🌫️': { Icon: Icons.WeatherFog,          color: IconColors.weatherFog },
  '🌦️': { Icon: Icons.WeatherRain,         color: IconColors.weatherRain },
  '🌧️': { Icon: Icons.WeatherRain,         color: IconColors.weatherRain },
  '🌨️': { Icon: Icons.WeatherSnow,         color: IconColors.weatherSnow },
  '❄️':  { Icon: Icons.WeatherHeavySnow,   color: IconColors.weatherSnow },
  '⛈️': { Icon: Icons.WeatherStorm,        color: IconColors.weatherStorm },
  '🌡️': { Icon: Icons.WeatherThermometer,  color: IconColors.weatherCloud },
};

// PlaceCategory string → icon + color  (replaces ITINERARY_CATEGORY_ICON + CUSTOM_CATEGORY_EMOJI)
export const CATEGORY_ICON_MAP: Record<string, IconEntry> = {
  restaurant: { Icon: Icons.Restaurant, color: IconColors.food },
  bar:        { Icon: Icons.Bar,        color: IconColors.food },
  hike:       { Icon: Icons.Hike,       color: IconColors.nature },
  sight:      { Icon: Icons.Sight,      color: IconColors.activity },
  activity:   { Icon: Icons.Anchor,     color: IconColors.travel },
  attraction: { Icon: Icons.Theater,    color: IconColors.activity },
  museum:     { Icon: Icons.Museum,     color: IconColors.activity },
  beach:      { Icon: Icons.Beach,      color: IconColors.nature },
  shop:       { Icon: Icons.Shop,       color: IconColors.shopping },
  travel:     { Icon: Icons.Flight,     color: IconColors.travel },
  lodging:    { Icon: Icons.Hotel,      color: IconColors.accommodation },
  leisure:    { Icon: Icons.Beach,      color: IconColors.nature },
  other:      { Icon: Icons.Compass,    color: IconColors.activity },
};

// Activity group name → icon + color  (replaces groupEmojis in PlaceList)
export const PLACE_GROUP_ICON_MAP: Record<string, IconEntry> = {
  'Hikes':            { Icon: Icons.Hike,    color: IconColors.nature },
  'On the Water':     { Icon: Icons.Anchor,  color: IconColors.travel },
  'Walks & Views':    { Icon: Icons.Walk,    color: IconColors.nature },
  'Nature & Culture': { Icon: Icons.Compass, color: IconColors.nature },
};
