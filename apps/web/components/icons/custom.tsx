"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

import {
  getVariants,
  IconWrapper,
  type IconProps,
} from "@/components/animate-ui/icons/icon";

/* ============================================================
   Custom icons built in the animate-ui style.
   These fill the gaps in the registry for our navigation set.
   Same IconWrapper API, same motion/react under the hood.
   ============================================================ */

const noop: Variants = {};

/* ─────────  Navigation  ───────── */

const homeVariants = {
  default: { path: noop },
  "default-return": { path: noop },
} as const;

function HomeIconComponent({ size, ...props }: IconProps<keyof typeof homeVariants>) {
  const variants = getVariants(homeVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"
        variants={variants.path}
      />
    </motion.svg>
  );
}
export function HomeIcon(props: IconProps<keyof typeof homeVariants>) {
  return <IconWrapper icon={HomeIconComponent} {...props} />;
}

const inboxVariants = {
  default: { tray: noop, arrow: noop },
  "default-return": { tray: noop, arrow: noop },
} as const;

function InboxIconComponent({ size, ...props }: IconProps<keyof typeof inboxVariants>) {
  const variants = getVariants(inboxVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M22 12h-6l-2 3h-4l-2-3H2"
        variants={variants.arrow}
      />
      <motion.path
        d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"
        variants={variants.tray}
      />
    </motion.svg>
  );
}
export function InboxIcon(props: IconProps<keyof typeof inboxVariants>) {
  return <IconWrapper icon={InboxIconComponent} {...props} />;
}

const hashVariants = {
  default: { line1: noop, line2: noop },
  "default-return": { line1: noop, line2: noop },
} as const;

function HashIconComponent({ size, ...props }: IconProps<keyof typeof hashVariants>) {
  const variants = getVariants(hashVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.line x1="4" x2="20" y1="9" y2="9" variants={variants.line1} />
      <motion.line x1="4" x2="20" y1="15" y2="15" variants={variants.line2} />
      <motion.line x1="10" x2="8" y1="3" y2="21" />
      <motion.line x1="16" x2="14" y1="3" y2="21" />
    </motion.svg>
  );
}
export function HashIcon(props: IconProps<keyof typeof hashVariants>) {
  return <IconWrapper icon={HashIconComponent} {...props} />;
}

const commandVariants = {
  default: { path: noop },
  "default-return": { path: noop },
} as const;

function CommandIconComponent({ size, ...props }: IconProps<keyof typeof commandVariants>) {
  const variants = getVariants(commandVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z"
        variants={variants.path}
      />
    </motion.svg>
  );
}
export function CommandIcon(props: IconProps<keyof typeof commandVariants>) {
  return <IconWrapper icon={CommandIconComponent} {...props} />;
}

/* ─────────  Workflow  ───────── */

const circleDotVariants = {
  default: { ring: noop, dot: noop },
} as const;

function CircleDotIconComponent({ size, ...props }: IconProps<keyof typeof circleDotVariants>) {
  const variants = getVariants(circleDotVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
      <motion.circle cx="12" cy="12" r="3" fill="currentColor" variants={variants.dot} />
    </motion.svg>
  );
}
export function CircleDotIcon(props: IconProps<keyof typeof circleDotVariants>) {
  return <IconWrapper icon={CircleDotIconComponent} {...props} />;
}

const circleVariants = { default: { ring: noop } } as const;

function CircleIconComponent({ size, ...props }: IconProps<keyof typeof circleVariants>) {
  const variants = getVariants(circleVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
    </motion.svg>
  );
}
export function CircleIcon(props: IconProps<keyof typeof circleVariants>) {
  return <IconWrapper icon={CircleIconComponent} {...props} />;
}

const circleAlertVariants = { default: { ring: noop, line: noop } } as const;

function CircleAlertIconComponent({ size, ...props }: IconProps<keyof typeof circleAlertVariants>) {
  const variants = getVariants(circleAlertVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
      <motion.line x1="12" x2="12" y1="8" y2="12" variants={variants.line} />
      <motion.line x1="12" x2="12.01" y1="16" y2="16" variants={variants.line} />
    </motion.svg>
  );
}
export function CircleAlertIcon(props: IconProps<keyof typeof circleAlertVariants>) {
  return <IconWrapper icon={CircleAlertIconComponent} {...props} />;
}

const flagVariants = { default: { path: noop } } as const;

function FlagIconComponent({ size, ...props }: IconProps<keyof typeof flagVariants>) {
  const variants = getVariants(flagVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.5 2A6 6 0 0 0 19 3a1 1 0 0 1 1 1v9a1 1 0 0 1-.4.8A6 6 0 0 1 16 15c-3 0-5-2-7.5-2a6 6 0 0 0-3.5 1"
        variants={variants.path}
      />
      <motion.path d="M4 22V4" />
    </motion.svg>
  );
}
export function FlagIcon(props: IconProps<keyof typeof flagVariants>) {
  return <IconWrapper icon={FlagIconComponent} {...props} />;
}

const bookmarkVariants = { default: { path: noop } } as const;

function BookmarkIconComponent({ size, ...props }: IconProps<keyof typeof bookmarkVariants>) {
  const variants = getVariants(bookmarkVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"
        variants={variants.path}
      />
    </motion.svg>
  );
}
export function BookmarkIcon(props: IconProps<keyof typeof bookmarkVariants>) {
  return <IconWrapper icon={BookmarkIconComponent} {...props} />;
}

const starVariants = { default: { path: noop } } as const;

function StarIconComponent({ size, ...props }: IconProps<keyof typeof starVariants>) {
  const variants = getVariants(starVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
        variants={variants.path}
      />
    </motion.svg>
  );
}
export { StarIconComponent as StarIconRaw };
export function StarIconFilled(props: IconProps<keyof typeof starVariants>) {
  return (
    <IconWrapper
      icon={(p) => (
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={p.size}
          height={p.size}
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...p}
        >
          <motion.path
            d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
            variants={getVariants(starVariants).path}
          />
        </motion.svg>
      )}
      {...props}
    />
  );
}

const shieldCheckVariants = { default: { path: noop, check: noop } } as const;

function ShieldCheckIconComponent({ size, ...props }: IconProps<keyof typeof shieldCheckVariants>) {
  const variants = getVariants(shieldCheckVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7Z"
        variants={variants.path}
      />
      <motion.path d="m9 12 2 2 4-4" variants={variants.check} />
    </motion.svg>
  );
}
export function ShieldCheckIcon(props: IconProps<keyof typeof shieldCheckVariants>) {
  return <IconWrapper icon={ShieldCheckIconComponent} {...props} />;
}

const tagVariants = { default: { path: noop, dot: noop } } as const;

function TagIconComponent({ size, ...props }: IconProps<keyof typeof tagVariants>) {
  const variants = getVariants(tagVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"
        variants={variants.path}
      />
      <motion.line x1="7" y1="7" x2="7.01" y2="7" variants={variants.dot} />
    </motion.svg>
  );
}
export function TagIcon(props: IconProps<keyof typeof tagVariants>) {
  return <IconWrapper icon={TagIconComponent} {...props} />;
}

const filterVariants = { default: { path: noop } } as const;

function FilterIconComponent({ size, ...props }: IconProps<keyof typeof filterVariants>) {
  const variants = getVariants(filterVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.polygon
        points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
        variants={variants.path}
      />
    </motion.svg>
  );
}
export function FilterIcon(props: IconProps<keyof typeof filterVariants>) {
  return <IconWrapper icon={FilterIconComponent} {...props} />;
}

const calendarVariants = { default: { rect: noop, line1: noop, line2: noop, day: noop } } as const;

function CalendarIconComponent({ size, ...props }: IconProps<keyof typeof calendarVariants>) {
  const variants = getVariants(calendarVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect width="18" height="18" x="3" y="4" rx="2" variants={variants.rect} />
      <motion.path d="M16 2v4M8 2v4M3 10h18" variants={variants.line1} />
      <motion.circle cx="12" cy="15" r="1.5" fill="currentColor" variants={variants.day} />
    </motion.svg>
  );
}
export function CalendarIcon(props: IconProps<keyof typeof calendarVariants>) {
  return <IconWrapper icon={CalendarIconComponent} {...props} />;
}

const layersIconVariants = { default: { back: noop, front: noop } } as const;
export function LayersIconCustom({ size, ...props }: IconProps<keyof typeof layersIconVariants>) {
  const variants = getVariants(layersIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="m12.83 2.18 8.94 4.06a1 1 0 0 1 0 1.82L12.83 12.1a2 2 0 0 1-1.66 0L2.23 8.06a1 1 0 0 1 0-1.82l8.94-4.06a2 2 0 0 1 1.66 0Z"
        variants={variants.back}
      />
      <motion.path
        d="M2 12.5 11.17 17a2 2 0 0 0 1.66 0L22 12.5"
        variants={variants.front}
      />
    </motion.svg>
  );
}

const sortVariants = { default: { path: noop } } as const;

function SortAscIconComponent({ size, ...props }: IconProps<keyof typeof sortVariants>) {
  const variants = getVariants(sortVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 20V4" variants={variants.path} />
    </motion.svg>
  );
}
export function SortAscIcon(props: IconProps<keyof typeof sortVariants>) {
  return <IconWrapper icon={SortAscIconComponent} {...props} />;
}

function SortDescIconComponent({ size, ...props }: IconProps<keyof typeof sortVariants>) {
  const variants = getVariants(sortVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M11 5h4M11 9h7M11 13h10M3 7l3-3 3 3M6 4v16" variants={variants.path} />
    </motion.svg>
  );
}
export function SortDescIcon(props: IconProps<keyof typeof sortVariants>) {
  return <IconWrapper icon={SortDescIconComponent} {...props} />;
}

const slidersVariants = { default: { track1: noop, track2: noop, thumb1: noop, thumb2: noop } } as const;

function SlidersIconComponent({ size, ...props }: IconProps<keyof typeof slidersVariants>) {
  const variants = getVariants(slidersVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.line x1="4" y1="21" x2="4" y2="14" variants={variants.track1} />
      <motion.line x1="4" y1="10" x2="4" y2="3" />
      <motion.line x1="12" y1="21" x2="12" y2="12" />
      <motion.line x1="12" y1="8" x2="12" y2="3" variants={variants.track2} />
      <motion.line x1="20" y1="21" x2="20" y2="16" />
      <motion.line x1="20" y1="12" x2="20" y2="3" variants={variants.track2} />
      <motion.circle cx="4" cy="7" r="2" fill="currentColor" variants={variants.thumb1} />
      <motion.circle cx="12" cy="11" r="2" fill="currentColor" variants={variants.thumb1} />
      <motion.circle cx="20" cy="15" r="2" fill="currentColor" variants={variants.thumb2} />
    </motion.svg>
  );
}
export function SlidersIcon(props: IconProps<keyof typeof slidersVariants>) {
  return <IconWrapper icon={SlidersIconComponent} {...props} />;
}

const gripVariants = { default: { dot: noop } } as const;

function GripVerticalIconComponent({ size, ...props }: IconProps<keyof typeof gripVariants>) {
  const variants = getVariants(gripVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <motion.circle cx="9" cy="6" r="1.4" variants={variants.dot} />
      <motion.circle cx="9" cy="12" r="1.4" variants={variants.dot} />
      <motion.circle cx="9" cy="18" r="1.4" variants={variants.dot} />
      <motion.circle cx="15" cy="6" r="1.4" variants={variants.dot} />
      <motion.circle cx="15" cy="12" r="1.4" variants={variants.dot} />
      <motion.circle cx="15" cy="18" r="1.4" variants={variants.dot} />
    </motion.svg>
  );
}
export function GripVerticalIcon(props: IconProps<keyof typeof gripVariants>) {
  return <IconWrapper icon={GripVerticalIconComponent} {...props} />;
}

const moreHVariants = { default: { dot: noop } } as const;

function MoreHorizontalIconComponent({ size, ...props }: IconProps<keyof typeof moreHVariants>) {
  const variants = getVariants(moreHVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <motion.circle cx="5" cy="12" r="1.6" variants={variants.dot} />
      <motion.circle cx="12" cy="12" r="1.6" variants={variants.dot} />
      <motion.circle cx="19" cy="12" r="1.6" variants={variants.dot} />
    </motion.svg>
  );
}
export function MoreHorizontalIcon(props: IconProps<keyof typeof moreHVariants>) {
  return <IconWrapper icon={MoreHorizontalIconComponent} {...props} />;
}

const chevronsUpDownVariants = { default: { path: noop } } as const;

function ChevronsUpDownIconComponent({ size, ...props }: IconProps<keyof typeof chevronsUpDownVariants>) {
  const variants = getVariants(chevronsUpDownVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="m7 15 5 5 5-5M7 9l5-5 5 5" variants={variants.path} />
    </motion.svg>
  );
}
export function ChevronsUpDownIcon(props: IconProps<keyof typeof chevronsUpDownVariants>) {
  return <IconWrapper icon={ChevronsUpDownIconComponent} {...props} />;
}

const moreVariants = { default: { dot: noop } } as const;
export function MoreHorizontalIconDots(props: IconProps<keyof typeof moreVariants>) {
  const variants = getVariants(moreVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <motion.circle cx="5" cy="12" r="1.4" variants={variants.dot} />
      <motion.circle cx="12" cy="12" r="1.4" variants={variants.dot} />
      <motion.circle cx="19" cy="12" r="1.4" variants={variants.dot} />
    </motion.svg>
  );
}

const trendUpVariants = { default: { path: noop } } as const;
function TrendingUpIconComponent({ size, ...props }: IconProps<keyof typeof trendUpVariants>) {
  const variants = getVariants(trendUpVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.polyline points="22 7 13.5 15.5 8.5 10.5 2 17" variants={variants.path} />
      <motion.polyline points="16 7 22 7 22 13" />
    </motion.svg>
  );
}
export function TrendingUpIcon(props: IconProps<keyof typeof trendUpVariants>) {
  return <IconWrapper icon={TrendingUpIconComponent} {...props} />;
}

function TrendingDownIconComponent({ size, ...props }: IconProps<keyof typeof trendUpVariants>) {
  const variants = getVariants(trendUpVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.polyline points="22 17 13.5 8.5 8.5 13.5 2 7" variants={variants.path} />
      <motion.polyline points="16 17 22 17 22 11" />
    </motion.svg>
  );
}
export function TrendingDownIcon(props: IconProps<keyof typeof trendUpVariants>) {
  return <IconWrapper icon={TrendingDownIconComponent} {...props} />;
}

const alertCircleVariants = { default: { ring: noop, line1: noop, line2: noop } } as const;
function AlertCircleIconComponent({ size, ...props }: IconProps<keyof typeof alertCircleVariants>) {
  const variants = getVariants(alertCircleVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
      <motion.line x1="12" y1="8" x2="12" y2="12" variants={variants.line1} />
      <motion.line x1="12" y1="16" x2="12.01" y2="16" variants={variants.line2} />
    </motion.svg>
  );
}
export function AlertCircleIcon(props: IconProps<keyof typeof alertCircleVariants>) {
  return <IconWrapper icon={AlertCircleIconComponent} {...props} />;
}

const infoVariants = { default: { ring: noop, line1: noop, line2: noop } } as const;
function InfoIconComponent({ size, ...props }: IconProps<keyof typeof infoVariants>) {
  const variants = getVariants(infoVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
      <motion.line x1="12" y1="16" x2="12" y2="12" variants={variants.line1} />
      <motion.line x1="12" y1="8" x2="12.01" y2="8" variants={variants.line2} />
    </motion.svg>
  );
}
export function InfoIcon(props: IconProps<keyof typeof infoVariants>) {
  return <IconWrapper icon={InfoIconComponent} {...props} />;
}

const helpVariants = { default: { ring: noop, line1: noop, line2: noop } } as const;
function HelpCircleIconComponent({ size, ...props }: IconProps<keyof typeof helpVariants>) {
  const variants = getVariants(helpVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" variants={variants.ring} />
      <motion.path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"
        variants={variants.line1}
      />
    </motion.svg>
  );
}
export function HelpCircleIcon(props: IconProps<keyof typeof helpVariants>) {
  return <IconWrapper icon={HelpCircleIconComponent} {...props} />;
}

const editVariants = { default: { path: noop } } as const;
function EditIconComponent({ size, ...props }: IconProps<keyof typeof editVariants>) {
  const variants = getVariants(editVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" variants={variants.path} />
      <motion.path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </motion.svg>
  );
}
export function EditIcon(props: IconProps<keyof typeof editVariants>) {
  return <IconWrapper icon={EditIconComponent} {...props} />;
}

const shareVariants = { default: { path: noop } } as const;
function ShareIconComponent({ size, ...props }: IconProps<keyof typeof shareVariants>) {
  const variants = getVariants(shareVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" variants={variants.path} />
    </motion.svg>
  );
}
export function ShareIcon(props: IconProps<keyof typeof shareVariants>) {
  return <IconWrapper icon={ShareIconComponent} {...props} />;
}

const usersVariants = { default: { user1: noop, user2: noop } } as const;
function UsersIconComponent({ size, ...props }: IconProps<keyof typeof usersVariants>) {
  const variants = getVariants(usersVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" variants={variants.user1} />
      <motion.circle cx="9" cy="7" r="4" />
      <motion.path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" variants={variants.user2} />
    </motion.svg>
  );
}
export function UsersIconCustom(props: IconProps<keyof typeof usersVariants>) {
  return <IconWrapper icon={UsersIconComponent} {...props} />;
}

const userIconVariants = { default: { path: noop, circle: noop } } as const;
function UserIconComponent({ size, ...props }: IconProps<keyof typeof userIconVariants>) {
  const variants = getVariants(userIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" variants={variants.path} />
      <motion.circle cx="12" cy="7" r="4" variants={variants.circle} />
    </motion.svg>
  );
}
export function UserIconCustom(props: IconProps<keyof typeof userIconVariants>) {
  return <IconWrapper icon={UserIconComponent} {...props} />;
}

const kanbanIconVariants = { default: { col1: noop, col2: noop, col3: noop } } as const;
function KanbanIconComponent({ size, ...props }: IconProps<keyof typeof kanbanIconVariants>) {
  const variants = getVariants(kanbanIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect x="3" y="3" width="5" height="18" rx="1" variants={variants.col1} />
      <motion.rect x="10" y="3" width="5" height="11" rx="1" variants={variants.col2} />
      <motion.rect x="17" y="3" width="4" height="15" rx="1" variants={variants.col3} />
    </motion.svg>
  );
}
export function KanbanIconCustom(props: IconProps<keyof typeof kanbanIconVariants>) {
  return <IconWrapper icon={KanbanIconComponent} {...props} />;
}

const listIconVariants = { default: { line1: noop, line2: noop, line3: noop } } as const;
function ListIconComponent({ size, ...props }: IconProps<keyof typeof listIconVariants>) {
  const variants = getVariants(listIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.line x1="8" y1="6" x2="21" y2="6" variants={variants.line1} />
      <motion.line x1="8" y1="12" x2="21" y2="12" variants={variants.line2} />
      <motion.line x1="8" y1="18" x2="21" y2="18" variants={variants.line3} />
      <motion.line x1="3" y1="6" x2="3.01" y2="6" />
      <motion.line x1="3" y1="12" x2="3.01" y2="12" />
      <motion.line x1="3" y1="18" x2="3.01" y2="18" />
    </motion.svg>
  );
}
export function ListIconCustom(props: IconProps<keyof typeof listIconVariants>) {
  return <IconWrapper icon={ListIconComponent} {...props} />;
}

const rowsIconVariants = { default: { row1: noop, row2: noop, row3: noop } } as const;
function RowsIconComponent({ size, ...props }: IconProps<keyof typeof rowsIconVariants>) {
  const variants = getVariants(rowsIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect x="3" y="3" width="18" height="6" rx="1" variants={variants.row1} />
      <motion.rect x="3" y="11" width="18" height="4" rx="1" variants={variants.row2} />
      <motion.rect x="3" y="17" width="18" height="4" rx="1" variants={variants.row3} />
    </motion.svg>
  );
}
export function RowsIcon(props: IconProps<keyof typeof rowsIconVariants>) {
  return <IconWrapper icon={RowsIconComponent} {...props} />;
}

const ganttVariants = { default: { bar1: noop, bar2: noop, bar3: noop } } as const;
function GanttIconComponent({ size, ...props }: IconProps<keyof typeof ganttVariants>) {
  const variants = getVariants(ganttVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.line x1="6" y1="6" x2="20" y2="6" />
      <motion.line x1="6" y1="12" x2="14" y2="12" />
      <motion.line x1="6" y1="18" x2="18" y2="18" />
      <motion.rect x="3" y="4" width="2" height="4" rx="0.5" fill="currentColor" variants={variants.bar1} />
      <motion.rect x="3" y="10" width="2" height="4" rx="0.5" fill="currentColor" variants={variants.bar2} />
      <motion.rect x="3" y="16" width="2" height="4" rx="0.5" fill="currentColor" variants={variants.bar3} />
    </motion.svg>
  );
}
export function GanttIcon(props: IconProps<keyof typeof ganttVariants>) {
  return <IconWrapper icon={GanttIconComponent} {...props} />;
}

const sparkleVariants = { default: { path: noop } } as const;
function SparkleIconComponent({ size, ...props }: IconProps<keyof typeof sparkleVariants>) {
  const variants = getVariants(sparkleVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="m12 3-1.9 5.8L4 10l5.5 1.9L12 18l2.5-6.1L20 10l-6.1-1.2L12 3Z"
        variants={variants.path}
      />
      <motion.path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </motion.svg>
  );
}
export function SparkleIcon(props: IconProps<keyof typeof sparkleVariants>) {
  return <IconWrapper icon={SparkleIconComponent} {...props} />;
}

const linkIconVariants = { default: { path: noop } } as const;
function LinkIconComponent({ size, ...props }: IconProps<keyof typeof linkIconVariants>) {
  const variants = getVariants(linkIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        variants={variants.path}
      />
      <motion.path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </motion.svg>
  );
}
export function LinkIconCustom(props: IconProps<keyof typeof linkIconVariants>) {
  return <IconWrapper icon={LinkIconComponent} {...props} />;
}

/* ─────────  Misc fill-ins  ───────── */

const atSignVariants = {
  default: { circle: noop },
  "default-return": { circle: noop },
} as const;

function AtSignIconComponent({ size, ...props }: IconProps<keyof typeof atSignVariants>) {
  const variants = getVariants(atSignVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="12" cy="12" r="4" variants={variants.circle} />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </motion.svg>
  );
}
export function AtSignIcon(props: IconProps<keyof typeof atSignVariants>) {
  return <IconWrapper icon={AtSignIconComponent} {...props} />;
}

const arrowUpRightVariants = {
  default: { line: noop },
  "default-return": { line: noop },
} as const;

function ArrowUpRightIconComponent({ size, ...props }: IconProps<keyof typeof arrowUpRightVariants>) {
  const variants = getVariants(arrowUpRightVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path d="M7 17 17 7" variants={variants.line} />
      <path d="M7 7h10v10" />
    </motion.svg>
  );
}
export function ArrowUpRightIcon(props: IconProps<keyof typeof arrowUpRightVariants>) {
  return <IconWrapper icon={ArrowUpRightIconComponent} {...props} />;
}

const gitPRVariants = {
  default: { circle: noop },
  "default-return": { circle: noop },
} as const;

function GitPullRequestIconComponent({ size, ...props }: IconProps<keyof typeof gitPRVariants>) {
  const variants = getVariants(gitPRVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle cx="6" cy="6" r="2" variants={variants.circle} />
      <motion.circle cx="6" cy="18" r="2" variants={variants.circle} />
      <motion.circle cx="18" cy="18" r="2" variants={variants.circle} />
      <path d="M6 8v8" />
      <path d="M18 11a4 4 0 0 0-4-4H8" />
      <path d="M14 6 18 10 14 14" />
    </motion.svg>
  );
}
export function GitPullRequestIcon(props: IconProps<keyof typeof gitPRVariants>) {
  return <IconWrapper icon={GitPullRequestIconComponent} {...props} />;
}

const creditCardVariants = {
  default: { rect: noop },
  "default-return": { rect: noop },
} as const;

function CreditCardIconComponent({ size, ...props }: IconProps<keyof typeof creditCardVariants>) {
  const variants = getVariants(creditCardVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect x="2" y="5" width="20" height="14" rx="2" variants={variants.rect} />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </motion.svg>
  );
}
export function CreditCardIcon(props: IconProps<keyof typeof creditCardVariants>) {
  return <IconWrapper icon={CreditCardIconComponent} {...props} />;
}

const viewIconVariants = {
  default: { rect: noop },
  "default-return": { rect: noop },
} as const;

function ViewIconComponent({ size, ...props }: IconProps<keyof typeof viewIconVariants>) {
  const variants = getVariants(viewIconVariants);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect x="3" y="3" width="18" height="18" rx="2" variants={variants.rect} />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </motion.svg>
  );
}
export function ViewIcon(props: IconProps<keyof typeof viewIconVariants>) {
  return <IconWrapper icon={ViewIconComponent} {...props} />;
}
