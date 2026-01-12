import { pgTable, varchar } from "drizzle-orm/pg-core";
import { getTableName } from "drizzle-orm";

const t = pgTable('test', {name: varchar('name', {length: 100})});

console.log('Keys:', Object.keys(t));
console.log('Has _:', '_' in t);
console.log('t._:', t._);
console.log('Using getTableName:', getTableName(t));

// Try accessing through symbols
const symbols = Object.getOwnPropertySymbols(t);
symbols.forEach(s => {
  if (s.toString().includes('Name')) {
    console.log(s.toString(), ':', t[s]);
  }
});
