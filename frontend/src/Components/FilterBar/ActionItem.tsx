import React, { useState } from "react";

export default function ActionItem({
                        icon,
                        label,
                        onClick,
                        disabled,
                    }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const [hover, setHover] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                color: disabled ? "rgba(234,234,234,0.5)" : "#eaeaea",
                cursor: disabled ? "not-allowed" : "pointer",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                transition: "background 120ms ease, transform 120ms ease, color 120ms ease",
                transform: hover && !disabled ? "translateY(-1px)" : "none",
            }}
            aria-label={label}
            title={label}
        >
      <span
          style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              color: hover && !disabled ? "#ffffff" : "#e5e7eb",
          }}
      >
        {icon}
      </span>
            <span
                style={{
                    fontSize: 13,
                    color: hover && !disabled ? "#ffffff" : "#eaeaea",
                    whiteSpace: "nowrap",
                }}
            >
        {label}
      </span>
        </button>
    );
}

