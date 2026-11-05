/**
 * Utility to convert Devanagari Hindi text to Roman Hinglish.
 * Thermal POS printers cannot print Devanagari characters (ESC/POS strips or corrupts them).
 * This transliteration ensures both on-screen and thermal KOT receipts print clearly in Roman script.
 */

const PHRASE_MAP: [RegExp, string][] = [
  [/हरे\s*कृष्णा/gi, "hare krishna"],
  [/हरे\s*राम/gi, "hare ram"],
  [/कम\s*तीखा/gi, "kam teekha"],
  [/ज्यादा\s*तीखा/gi, "zyada teekha"],
  [/बिना\s*प्याज/gi, "bina pyaaz"],
  [/बिना\s*लहसुन/gi, "bina lehsun"],
  [/कम\s*नमक/gi, "kam namak"],
  [/ज्यादा\s*नमक/gi, "zyada namak"],
  [/कम\s*तेल/gi, "kam tel"],
  [/कम\s*मिर्ची/gi, "kam mirchi"],
  [/ज्यादा\s*मिर्ची/gi, "zyada mirchi"],
  [/मत\s*डालना/gi, "mat daalna"],
  [/मत\s*देना/gi, "mat dena"],
  [/गरम\s*करके/gi, "garam karke"],
  [/गरमा\s*गरम/gi, "garma garam"],
  [/पैक\s*कर\s*दो/gi, "pack kar do"],
  [/अलग\s*से/gi, "alag se"]
];

const WORD_MAP: Record<string, string> = {
  "हरे": "hare",
  "कृष्णा": "krishna",
  "कृष्ण": "krishna",
  "राम": "ram",
  "राधे": "radhe",
  "श्याम": "shyam",
  "मिर्ची": "mirchi",
  "कम": "kam",
  "रखना": "rakhna",
  "रखो": "rakho",
  "डालना": "daalna",
  "डालो": "daalo",
  "देना": "dena",
  "दो": "do",
  "प्याज": "pyaaz",
  "लहसुन": "lehsun",
  "तीखा": "teekha",
  "स्पाइसी": "spicy",
  "ज्यादा": "zyada",
  "नमक": "namak",
  "चीनी": "cheeni",
  "मीठा": "meetha",
  "तेल": "tel",
  "घी": "ghee",
  "मक्खन": "butter",
  "बटर": "butter",
  "पनीर": "paneer",
  "रोटी": "roti",
  "नान": "naan",
  "चावल": "chawal",
  "सब्जी": "sabji",
  "पानी": "pani",
  "ठंडा": "thanda",
  "गरम": "garam",
  "गर्म": "garam",
  "चटनी": "chutney",
  "दही": "dahi",
  "रायता": "raita",
  "सलाद": "salad",
  "ग्रेवी": "gravy",
  "सॉस": "sauce",
  "पैक": "pack",
  "पार्सल": "parcel",
  "फास्ट": "fast",
  "जल्दी": "jaldi",
  "नहीं": "nahi",
  "मत": "mat",
  "बिना": "bina",
  "के": "ke",
  "साथ": "saath",
  "और": "aur",
  "भी": "bhi",
  "एक": "ek",
  "तीन": "teen",
  "चार": "char",
  "पांच": "paanch",
  "छह": "cheh",
  "हाफ": "half",
  "फुल": "full",
  "प्लेट": "plate",
  "गिलास": "glass",
  "कप": "cup",
  "बाउल": "bowl",
  "एक्स्ट्रा": "extra",
  "क्रिस्पी": "crispy",
  "कड़क": "kadak",
  "पतली": "patli",
  "कुरकुरा": "kurkura",
  "अच्छा": "accha",
  "अच्छे": "acche",
  "से": "se",
  "करना": "karna",
  "कर": "kar",
  "हो": "ho",
  "गया": "gaya",
  "है": "hai",
  "हैं": "hain",
  "था": "tha",
  "थी": "thi",
  "थे": "the"
};

const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy'
};

const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'अं': 'an', 'अः': 'ah'
};

const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': ''
};

export function devanagariToHinglish(text: string): string {
  if (!text) return "";
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (!hasDevanagari) return text;

  let result = text;
  for (const [pattern, replacement] of PHRASE_MAP) {
    result = result.replace(pattern, replacement);
  }

  const words = result.split(/(\s+|[^\u0900-\u097F\w]+)/);
  result = words.map(tok => {
    if (WORD_MAP[tok]) return WORD_MAP[tok];
    return tok;
  }).join('');

  if (!/[\u0900-\u097F]/.test(result)) {
    return result;
  }

  let out = '';
  const len = result.length;
  for (let i = 0; i < len; i++) {
    const ch = result[i];
    const code = ch.charCodeAt(0);

    if (code >= 0x0900 && code <= 0x097F) {
      if (VOWELS[ch]) {
        out += VOWELS[ch];
      } else if (MATRAS[ch] !== undefined) {
        out += MATRAS[ch];
      } else if (CONSONANTS[ch]) {
        const base = CONSONANTS[ch];
        const nextCh = i + 1 < len ? result[i + 1] : null;
        if (nextCh === '्') {
          out += base;
          i++; // skip halant
        } else if (nextCh && MATRAS[nextCh] !== undefined) {
          out += base + MATRAS[nextCh];
          i++; // skip matra
        } else {
          const afterNext = i + 1 < len ? result[i + 1] : ' ';
          if (/[\s\p{P}]/u.test(afterNext) || i + 1 === len) {
            out += base;
          } else {
            out += base + 'a';
          }
        }
      } else {
        if (ch === '।') out += '.';
        else if (ch === '॥') out += '.';
      }
    } else {
      out += ch;
    }
  }

  return out.replace(/\s+/g, ' ').trim();
}
