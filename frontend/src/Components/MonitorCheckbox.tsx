import { useState } from "react";

export default function MonitorCheckbox({ uuid, isActive }: { uuid: string, isActive: boolean }) {
    const [checked, setChecked] = useState(isActive);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setChecked(isChecked);
        try {
                const res = await fetch(`/api/monitor?id=${uuid}`, {
                    method: isChecked ? "POST" : "DELETE"
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
