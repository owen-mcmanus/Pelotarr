import { useState, useEffect } from "react";

const API_KEY = import.meta.env.VITE_API_KEY;

export default function MonitorCheckbox({uuid, isActive, stage, onToggle}: { uuid: string, isActive: boolean, stage?:number, onToggle?:(nextActive: boolean) => void }) {
    const [checked, setChecked] = useState(isActive);

    useEffect(() => {
        setChecked(isActive);
    }, [isActive]);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setChecked(isChecked);
        onToggle?.(e.target.checked);

        try {
                console.log(API_KEY);
                const headers: Record<string, string> = {};
                if (API_KEY) headers["X-API-Key"] = API_KEY;

                const route = stage ? `/api/monitor?id=${uuid}::${stage}` : `/api/monitor?id=${uuid}`;

                const res = await fetch(route, {
                    method: isChecked ? "POST" : "DELETE",
                    headers
                });



                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText}`);
                }
                console.log(`Sent UUID ${uuid}, server responded:`, await res.json());
            } catch (err) {
                console.error("Failed to send UUID:", err);
            }
    };

    return (
        <input type="checkbox" checked={checked} onChange={handleChange} />
    );
}
