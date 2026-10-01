import { jdn } from './dates';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const STEMS_PY = ['jiǎ', 'yǐ', 'bǐng', 'dīng', 'wù', 'jǐ', 'gēng', 'xīn', 'rén', 'guǐ'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const BRANCH_ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

export interface SexagenaryDay { index: number; stem: number; branch: number; hanzi: string; hangul: string; }

/**
 * Sexagenary day (干支) for a civil date. (JDN + 49) mod 60 == 0 is 甲子.
 * Anchors: 2000-01-01 = 戊午; 1949-10-01 = 甲子.
 */
export function sexagenaryDay(ymd: string): SexagenaryDay {
  const index = (((jdn(ymd) + 49) % 60) + 60) % 60;
  const stem = index % 10, branch = index % 12;
  return { index, stem, branch, hanzi: STEMS[stem] + BRANCHES[branch], hangul: STEMS_KO[stem] + BRANCHES_KO[branch] };
}

/** Sexagenary year for a lunisolar year number (year beginning at Chinese New Year). 1984 = 甲子. */
export function sexagenaryYear(lunarYear: number): { stem: number; branch: number; hanzi: string; animal: string } {
  const index = (((lunarYear - 1984) % 60) + 60) % 60;
  const stem = index % 10, branch = index % 12;
  return { stem, branch, hanzi: STEMS[stem] + BRANCHES[branch], animal: BRANCH_ANIMALS[branch] };
}
