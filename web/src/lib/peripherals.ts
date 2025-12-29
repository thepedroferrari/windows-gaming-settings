/**
 * Peripheral data definitions for the Peripherals section
 */

import type { MonitorSoftwareType, PeripheralType } from './types'
import { MONITOR_SOFTWARE_TYPES, PERIPHERAL_TYPES } from './types'

/** Peripheral option with auto-install capability */
export interface PeripheralOption {
  readonly value: PeripheralType
  readonly label: string
  readonly hint: string
}

/** Monitor software option with auto-install capability */
export interface MonitorOption {
  readonly value: MonitorSoftwareType
  readonly label: string
  readonly hint: string
}

/** External download link */
export interface PeripheralLink {
  readonly title: string
  readonly url: string
  readonly category?: string
}

/** Peripheral gear options (auto-installable via winget) */
export const PERIPHERAL_OPTIONS: readonly PeripheralOption[] = [
  { value: PERIPHERAL_TYPES.LOGITECH, label: 'Logitech', hint: 'G HUB' },
  { value: PERIPHERAL_TYPES.RAZER, label: 'Razer', hint: 'Synapse 4' },
  { value: PERIPHERAL_TYPES.CORSAIR, label: 'Corsair', hint: 'iCUE' },
  { value: PERIPHERAL_TYPES.STEELSERIES, label: 'SteelSeries', hint: 'GG' },
  { value: PERIPHERAL_TYPES.ASUS, label: 'ASUS ROG', hint: 'Armoury Crate' },
  { value: PERIPHERAL_TYPES.WOOTING, label: 'Wooting', hint: 'Wootility' },
] as const

/** Monitor software options (auto-installable via winget) */
export const MONITOR_OPTIONS: readonly MonitorOption[] = [
  { value: MONITOR_SOFTWARE_TYPES.DELL, label: 'Dell', hint: 'Display Manager' },
  { value: MONITOR_SOFTWARE_TYPES.LG, label: 'LG', hint: 'OnScreen Control' },
  { value: MONITOR_SOFTWARE_TYPES.HP, label: 'HP', hint: 'Display Center' },
] as const

/** Manual download links for peripheral software */
export const PERIPHERAL_LINKS: readonly PeripheralLink[] = [
  // Major Brands
  {
    title: 'Logitech G HUB',
    url: 'https://www.logitechg.com/en-us/innovation/g-hub.html',
    category: 'major',
  },
  { title: 'Razer Synapse', url: 'https://www.razer.com/synapse-4', category: 'major' },
  { title: 'Corsair iCUE', url: 'https://www.corsair.com/icue', category: 'major' },
  { title: 'SteelSeries GG', url: 'https://steelseries.com/gg', category: 'major' },
  {
    title: 'ASUS Armoury Crate',
    url: 'https://www.asus.com/armoury-crate/',
    category: 'major',
  },
  {
    title: 'HyperX NGenuity',
    url: 'https://hyperxgaming.com/ngenuitydl',
    category: 'major',
  },
  // Gaming Mice
  {
    title: 'Glorious Core',
    url: 'https://www.gloriousgaming.com/pages/software',
    category: 'mice',
  },
  { title: 'Roccat Swarm', url: 'https://support.roccat.com/', category: 'mice' },
  {
    title: 'Finalmouse',
    url: 'https://finalmouse.com/pages/software',
    category: 'mice',
  },
  { title: 'Pulsar', url: 'https://www.pulsar.gg/pages/software', category: 'mice' },
  { title: 'Lamzu', url: 'https://lamzu.com/pages/software', category: 'mice' },
  {
    title: 'Zowie',
    url: 'https://zowie.benq.com/en-us/support/download.html',
    category: 'mice',
  },
  {
    title: 'Endgame Gear',
    url: 'https://www.endgamegear.com/downloads',
    category: 'mice',
  },
  { title: 'Vaxee', url: 'https://vaxee.co/support', category: 'mice' },
  // Keyboards
  {
    title: 'Wooting Wootility',
    url: 'https://wooting.io/wootility',
    category: 'keyboards',
  },
  {
    title: 'DrunkDeer',
    url: 'https://drunkdeer.com/pages/downloads',
    category: 'keyboards',
  },
  { title: 'Keychron', url: 'https://www.keychron.com/pages/firmware', category: 'keyboards' },
  { title: 'Ducky', url: 'https://www.duckychannel.com.tw/en/Support', category: 'keyboards' },
  { title: 'NuPhy', url: 'https://nuphy.com/pages/software', category: 'keyboards' },
  { title: 'Akko', url: 'https://en.akkogear.com/support/', category: 'keyboards' },
  // Controllers
  { title: '8BitDo', url: 'https://support.8bitdo.com/', category: 'controllers' },
  {
    title: 'Xbox Accessories',
    url: 'https://support.xbox.com/en-US/help/hardware-network/accessories/xbox-accessories-app',
    category: 'controllers',
  },
  {
    title: 'DualSense',
    url: 'https://www.playstation.com/en-us/support/hardware/dualsense/',
    category: 'controllers',
  },
  // Audio
  { title: 'Audeze HQ', url: 'https://www.audeze.com/pages/software', category: 'audio' },
  {
    title: 'Beyerdynamic',
    url: 'https://global.beyerdynamic.com/service/downloads',
    category: 'audio',
  },
] as const

/** Manual download links for monitor software */
export const MONITOR_LINKS: readonly PeripheralLink[] = [
  {
    title: 'Dell Display Manager',
    url: 'https://www.dell.com/support/home/drivers/driversdetails?driverid=p9jfv',
  },
  { title: 'LG OnScreen Control', url: 'https://www.lg.com/us/support/software-firmware' },
  { title: 'HP Display Center', url: 'https://support.hp.com/us-en/drivers' },
  { title: 'ASUS ProArt', url: 'https://www.asus.com/proart-professional-displays/' },
  { title: 'Samsung Odyssey', url: 'https://www.samsung.com/us/support/' },
  { title: 'BenQ Software', url: 'https://www.benq.com/en-us/support/downloads.html' },
  { title: 'MSI Display', url: 'https://www.msi.com/support/download' },
  { title: 'ViewSonic', url: 'https://www.viewsonic.com/us/support/downloads/' },
  { title: 'Gigabyte Control', url: 'https://www.gigabyte.com/Support' },
  { title: 'AOC G-Menu', url: 'https://aoc.com/en/gaming/support' },
] as const
