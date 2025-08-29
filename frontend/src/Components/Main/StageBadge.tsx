import { memo } from "react";

export const StageBadge = memo(function StageBadge() {
    return (
        <span
            style={{
                fontSize: 11,
                lineHeight: "16px",
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(255,204,0,0.12)",
                color: "#ffe185",
                border: "1px solid rgba(255,204,0,0.25)",
                marginRight: 8,
                display: "inline-block",
                verticalAlign: "middle",
                userSelect: "none",
            }}
        >
      STAGE
    </span>
    );
});
