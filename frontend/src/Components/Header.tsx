import {useState} from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar.tsx";

export default function Header(){
    const [query, setQuery] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        navigate(`/search/${encodeURIComponent(trimmed)}`);
    };

    return (
        <div
            style={{
                width: "100%",
                height: "60px",
                backgroundColor: "#2a2a2a",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
            }}
        >
            <img
                style={{
                    width: "32px",
                    height: "32px",
                    paddingLeft: "20px",
                    marginRight: "160px",
                }}
                src="/pelotarr-logo.svg"
                alt="Logo"
            />
            <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                width={320}
            />
        </div>
    );
}