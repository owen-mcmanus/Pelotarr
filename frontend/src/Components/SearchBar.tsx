import { useState } from "react";

type Props = {
    value: string;
    onChange: (v: string) => void;
    onSubmit?: (v: string) => void;
    placeholder?: string;
    width?: number | string;
};

export default function SearchBar({
                                      value,
                                      onChange,
                                      onSubmit,
                                      placeholder = "Search",
                                      width = 280,
                                  }: Props) {
    const [focused, setFocused] = useState(false);

    return (
        <div style={{display: "flex", alignItems: "center", gap: 8, width}}>
            <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="magnifying-glass"
                 width="18" role="img"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{opacity: 0.9, flex: "0 0 auto", color: "#e5e7eb"}}>
                <path fill="currentColor"
                      d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path>
            </svg>

            {/* input + underline */}
            <div style={{flex: 1, position: "relative"}}>
                <input
                    type="search"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSubmit?.(value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    aria-label="Search"
                    style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#e5e7eb",
                        padding: "6px 0 6px 0",
                        fontSize: 14,
                    }}
                />
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 1,
                        background: focused ? "#e5e7eb" : "rgba(234,234,234,0.6)",
                        transition: "background 120ms ease",
                    }}
                />
            </div>
        </div>
    );
}
