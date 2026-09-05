export function progressBar(value:number|null|undefined,length=12){const n=Math.max(0,Math.min(100,Number(value??0)));const filled=Math.round(n/100*length);return "█".repeat(filled)+"░".repeat(length-filled)}
export function resistanceStatus(value:number){if(value>=90)return"CRITICAL";
if(value>=60)return"HIGH";
if(value>=30)return"ELEVATED";
return"LOW"}