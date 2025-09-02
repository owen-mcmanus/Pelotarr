import ActionItem from "./FilterBar/ActionItem.tsx";


type Props = {
    onSyncStatus: () => void;
};

export default function FilterBar({onSyncStatus}: Props) {
    const onRssSync = async () => {
        try {
            const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

            const res = await fetch("/api/rsssync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey ? { "x-api-key": apiKey } : {}),
                },
            });

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            console.log("RSS sync triggered.");
        } catch (e) {
            console.error("Failed to trigger RSS sync:", e);
        }
    };

    const onSyncJellyfin = async () => {
        try {
            const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

            const res = await fetch("/api/jellysync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey ? { "x-api-key": apiKey } : {}),
                },
            });

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            console.log("Jellyfin sync triggered.");
        } catch (e) {
            console.error("Failed to trigger Jellyfin sync:", e);
        }
    };

    return (
        <div
            style={{
                height: "60px",
                backgroundColor: "rgb(38, 38, 38)",
                display: "flex",
                alignItems: "center",
            }}
        >
            <ActionItem
                label="Sync Status"
                onClick={() => {onSyncStatus()}}
                icon={<IconRefresh />}
            />
            <ActionItem
                label="RSS Sync"
                onClick={onRssSync}
                icon={<IconRss />}
            />

            {/* divider */}
            <div
                aria-hidden
                style={{
                    width: 1,
                    height: 28,
                    background: "rgba(234,234,234,0.25)",
                    margin: "0 6px",
                }}
            />

            <ActionItem
                label="Sync Jellyfin"
                onClick={onSyncJellyfin}
                icon={<IconSearch />}
            />
        </div>
    );
}

/* ---- icons (no deps) ---- */

function IconRefresh() {
    return (
        <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrows-rotate"
             className="svg-inline--fa fa-arrows-rotate Icon-default-ZpHc_" role="img"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{fontSize: "21px"}}>
            <path fill="currentColor"
                  d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160 352 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l111.5 0c0 0 0 0 0 0l.4 0c17.7 0 32-14.3 32-32l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 35.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1L16 432c0 17.7 14.3 32 32 32s32-14.3 32-32l0-35.1 17.6 17.5c0 0 0 0 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.8c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352l34.4 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L48.4 288c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z"></path>
        </svg>
    );
}

function IconRss() {
    return (
        <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="rss"
             className="svg-inline--fa fa-rss Icon-default-ZpHc_" role="img" xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 448 512" style={{fontSize: "21px"}}>
            <path fill="currentColor"
                  d="M0 64C0 46.3 14.3 32 32 32c229.8 0 416 186.2 416 416c0 17.7-14.3 32-32 32s-32-14.3-32-32C384 253.6 226.4 96 32 96C14.3 96 0 81.7 0 64zM0 416a64 64 0 1 1 128 0A64 64 0 1 1 0 416zM32 160c159.1 0 288 128.9 288 288c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-123.7-100.3-224-224-224c-17.7 0-32-14.3-32-32s14.3-32 32-32z"></path>
        </svg>
    );
}

function IconSearch() {
    return (
        <img viewBox="0 0 24 24" width="25px" height="25px" aria-hidden="true" src={"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/jellyfin-vue.svg"} style={{fontSize: "21px"}}>
        </img>
    );
}