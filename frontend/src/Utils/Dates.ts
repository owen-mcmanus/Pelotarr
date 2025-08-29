export const americanizeDate = (date: string) => {
    const [dayStr, monthStr] = date.split(".");
    return `${monthStr}/${dayStr}`;
};

// Keep the original name to avoid breaking callers
export const calulateStageDay = (date: string, stage: number): string => {
    if (typeof date !== "string" || !date.includes(".")) return date;
    const [dayStr, monthStr] = date.split(".");
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    if (!Number.isFinite(day) || !Number.isFinite(month)) return date;

    const offset = Math.max(0, (stage ?? 1) - 1);
    const year = new Date().getFullYear();
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + offset);

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${mm}/${dd}`;
};
