/**
 * Handset copy. Screens stay short because gateways cap them near 182 characters.
 * Names, KES, M-Pesa, Bitcoin, and PesaSense stay as written.
 */

export type UssdLang = "en" | "sw";

export function isUssdLang(value: unknown): value is UssdLang {
  return value === "en" || value === "sw";
}

type Copy = {
  unlinked: string;
  main: string;
  notLinked: string;
  wentWrong: string;
  numberKeys: string;
  goodbye: string;
  notOption: string;
  enterCode: string;
  enterCodeShort: string;
  buyNotAllowed: string;
  noBuyYet: string;
  wholeShillings: string;
  setAddress: string;
  cancelled: string;
  startingBuy: string;
  confirmOrCancel: string;
  checkOrDial: string;
  lessonRange: string;
  bufferFirstBuy: string;
  amountRefused: string;
  amountBetween: string;
  buyUpTo: string;
  habitIs: string;
  enterAmount: string;
  buy: string;
  toWallet: string;
  confirm: string;
  cancel: string;
  checkAgain: string;
  exit: string;
  bufferComesFirst: string;
  floor: string;
  notNext: string;
  surplus: string;
  to: string;
  typical: string;
  safeFloor: string;
  noHabit: string;
  ofFloor: string;
  youApprove: string;
  weekly: string;
  monthly: string;
  noChama: string;
  aMonth: string;
  payOwnWallet: string;
  holdsNoSats: string;
  couldNotStart: string;
  mpesaSent: string;
  code: string;
  enterPin: string;
  waitingPin: string;
  sendingSats: string;
  filled: string;
  didNotFinish: string;
  paidNotSent: string;
  couldNotFill: string;
  inProgress: string;
  quoted: string;
  languageMenu: string;
  notAuthorised: string;
  couldNotRead: string;
  wrongCode: string;
  numberUnsupported: string;
  sessionTooLong: string;
  sessionMismatch: string;
  sessionFinished: string;
  sessionExpired: string;
  tooManyTries: string;
  codeExpired: string;
  buyLimit: string;
  couldNotStartLater: string;
  couldNotCheck: string;
};

const en: Copy = {
  unlinked: "Welcome to PesaSense\n1 Link with code\n2 Demo Amina\n3 Demo Brian\n9 Language\n0 Exit",
  main: "Welcome to PesaSense\n1 Surplus\n2 Habit\n3 Buy Bitcoin\n4 Buy status\n5 Learn\n6 Chama\n9 Language\n0 Exit",
  notLinked: "This number is not linked. Dial again.",
  wentWrong: "Something went wrong. Dial again.",
  numberKeys: "Use the number keys. Dial again.",
  goodbye: "Goodbye.",
  notOption: "Not an option. Dial again.",
  enterCode: "Enter the 6-digit code from the PesaSense app.",
  enterCodeShort: "Enter the 6-digit code from the app.",
  buyNotAllowed: "This buy is not allowed.",
  noBuyYet: "No buy on this number yet.",
  wholeShillings: "Enter a whole number of shillings.",
  setAddress: "Set a Lightning address in the PesaSense app, then dial again.",
  cancelled: "Cancelled. Nothing was sent.",
  startingBuy: "Starting your buy.",
  confirmOrCancel: "Reply 1 to confirm or 2 to cancel. Dial again.",
  checkOrDial: "Reply 1 to check again, or dial again.",
  lessonRange: "Reply with a lesson number, or dial again.",
  bufferFirstBuy: "Build a buffer before buying Bitcoin.",
  amountRefused: "This amount is not allowed.",
  amountBetween: "Amount must be between {min} and {max} KES.",
  buyUpTo: "Buy up to {max}.",
  habitIs: "Habit {amount}",
  enterAmount: "Enter amount in KES:",
  buy: "Buy {amount}",
  toWallet: "To {destination}",
  confirm: "1 Confirm",
  cancel: "2 Cancel",
  checkAgain: "1 Check again",
  exit: "0 Exit",
  bufferComesFirst: "Buffer comes first.",
  floor: "Floor {amount}.",
  notNext: "Bitcoin is not the next step.",
  surplus: "Surplus {floor} to {ceiling}",
  to: "to",
  typical: "Typical {amount}",
  safeFloor: "Safe floor {amount}",
  noHabit: "No Bitcoin habit yet.\nBuild a buffer first.",
  ofFloor: "{pct}% of the safe floor.",
  youApprove: "You approve each buy.",
  weekly: "weekly",
  monthly: "monthly",
  noChama: "No chama on this profile.",
  aMonth: "{amount} a month.",
  payOwnWallet: "Pay from your own wallet.",
  holdsNoSats: "PesaSense holds no sats.",
  couldNotStart: "Could not start this buy. Nothing was taken.",
  mpesaSent: "M-Pesa prompt sent.",
  code: "Code {code}",
  enterPin: "Enter your PIN. We hold no sats.",
  waitingPin: "Waiting for M-Pesa PIN",
  sendingSats: "M-Pesa paid. Sending sats.",
  filled: "Filled.",
  didNotFinish: "Did not finish.",
  paidNotSent: "Paid, sats not sent yet.",
  couldNotFill: "Could not fill.",
  inProgress: "In progress.",
  quoted: "Quote ready.",
  languageMenu: "Language\n1 English\n2 Kiswahili\n0 Back",
  notAuthorised: "Not authorised.",
  couldNotRead: "Could not read this request.",
  wrongCode: "Wrong short code.",
  numberUnsupported: "This number is not supported.",
  sessionTooLong: "This session is too long. Dial again.",
  sessionMismatch: "This session does not match the number.",
  sessionFinished: "This session is finished. Dial again.",
  sessionExpired: "Session expired. Dial again.",
  tooManyTries: "Too many tries. Wait a minute.",
  codeExpired: "Code not recognised or it has expired.",
  buyLimit: "Buy limit reached. Try again later.",
  couldNotStartLater: "Could not start the buy. Try again later.",
  couldNotCheck: "Could not check the buy. Try again shortly.",
};

const sw: Copy = {
  unlinked: "Karibu PesaSense\n1 Unganisha kwa msimbo\n2 Mfano Amina\n3 Mfano Brian\n9 Lugha\n0 Toka",
  main: "Karibu PesaSense\n1 Ziada\n2 Tabia\n3 Nunua Bitcoin\n4 Hali ya ununuzi\n5 Jifunze\n6 Chama\n9 Lugha\n0 Toka",
  notLinked: "Nambari hii haijaunganishwa. Piga tena.",
  wentWrong: "Hitilafu imetokea. Piga tena.",
  numberKeys: "Tumia vitufe vya nambari. Piga tena.",
  goodbye: "Kwaheri.",
  notOption: "Si chaguo. Piga tena.",
  enterCode: "Weka msimbo wa tarakimu 6 kutoka kwenye programu ya PesaSense.",
  enterCodeShort: "Weka msimbo wa tarakimu 6 kutoka kwenye programu.",
  buyNotAllowed: "Ununuzi huu hauruhusiwi.",
  noBuyYet: "Bado hakuna ununuzi kwa nambari hii.",
  wholeShillings: "Weka shilingi kamili.",
  setAddress: "Weka anwani ya Lightning kwenye programu ya PesaSense, kisha piga tena.",
  cancelled: "Imefutwa. Hakuna kilichotumwa.",
  startingBuy: "Ununuzi unaanza.",
  confirmOrCancel: "Jibu 1 kuthibitisha au 2 kufuta. Piga tena.",
  checkOrDial: "Jibu 1 kuangalia tena, au piga tena.",
  lessonRange: "Jibu nambari ya somo, au piga tena.",
  bufferFirstBuy: "Jenga akiba kabla ya kununua Bitcoin.",
  amountRefused: "Kiasi hiki hakiruhusiwi.",
  amountBetween: "Kiasi lazima kiwe kati ya {min} na {max} KES.",
  buyUpTo: "Nunua hadi {max}.",
  habitIs: "Tabia {amount}",
  enterAmount: "Weka kiasi kwa KES:",
  buy: "Nunua {amount}",
  toWallet: "Kwenda {destination}",
  confirm: "1 Thibitisha",
  cancel: "2 Futa",
  checkAgain: "1 Angalia tena",
  exit: "0 Toka",
  bufferComesFirst: "Akiba inakuja kwanza.",
  floor: "Kiwango {amount}.",
  notNext: "Bitcoin si hatua inayofuata.",
  surplus: "Ziada {floor} hadi {ceiling}",
  to: "hadi",
  typical: "Kawaida {amount}",
  safeFloor: "Kiwango salama {amount}",
  noHabit: "Bado hakuna tabia ya Bitcoin.\nJenga akiba kwanza.",
  ofFloor: "{pct}% ya kiwango salama.",
  youApprove: "Unakubali kila ununuzi.",
  weekly: "kila wiki",
  monthly: "kila mwezi",
  noChama: "Hakuna chama kwenye wasifu huu.",
  aMonth: "{amount} kwa mwezi.",
  payOwnWallet: "Lipa kutoka mkoba wako.",
  holdsNoSats: "PesaSense haishiki sats.",
  couldNotStart: "Ununuzi haukuanza. Hakuna kilichochukuliwa.",
  mpesaSent: "Ombi la M-Pesa limetumwa.",
  code: "Msimbo {code}",
  enterPin: "Weka PIN yako. Hatushiki sats.",
  waitingPin: "Inasubiri PIN ya M-Pesa",
  sendingSats: "M-Pesa imelipwa. Inatuma sats.",
  filled: "Imekamilika.",
  didNotFinish: "Haikumalizika.",
  paidNotSent: "Imelipwa, sats bado hazijatumwa.",
  couldNotFill: "Haikuweza kukamilika.",
  inProgress: "Inaendelea.",
  quoted: "Bei iko tayari.",
  languageMenu: "Lugha\n1 English\n2 Kiswahili\n0 Rudi",
  notAuthorised: "Hauruhusiwi.",
  couldNotRead: "Hatukuweza kusoma ombi hili.",
  wrongCode: "Msimbo mfupi si sahihi.",
  numberUnsupported: "Nambari hii haitumiki.",
  sessionTooLong: "Kipindi hiki ni kirefu sana. Piga tena.",
  sessionMismatch: "Kipindi hiki hakilingani na nambari.",
  sessionFinished: "Kipindi hiki kimekwisha. Piga tena.",
  sessionExpired: "Kipindi kimeisha. Piga tena.",
  tooManyTries: "Majaribio mengi. Subiri dakika moja.",
  codeExpired: "Msimbo haukutambulika au umeisha.",
  buyLimit: "Kikomo cha ununuzi kimefikiwa. Jaribu baadaye.",
  couldNotStartLater: "Ununuzi haukuanza. Jaribu baadaye.",
  couldNotCheck: "Hatukuweza kuangalia ununuzi. Jaribu baada ya muda mfupi.",
};

export function ussdCopy(lang: UssdLang): Copy {
  return lang === "sw" ? sw : en;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

/** Map invest-rule sentences onto the handset language. */
export function localizeRefusal(lang: UssdLang, refusal: string): string {
  const copy = ussdCopy(lang);
  if (/buffer/i.test(refusal)) return copy.bufferFirstBuy;
  const between = refusal.match(/between\s+([\d,]+)\s+and\s+([\d,]+)/i);
  if (between?.[1] && between[2]) {
    return fill(copy.amountBetween, { min: between[1], max: between[2] });
  }
  if (/not allowed|too small|whole number|shillings/i.test(refusal)) {
    return copy.amountRefused;
  }
  return copy.buyNotAllowed;
}
