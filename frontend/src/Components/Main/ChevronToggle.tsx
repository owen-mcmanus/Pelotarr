import { memo } from "react";

type Props = {
    open: boolean;
    onClick: () => void;
    size?: number;
    src?: string;
};

function ChevronToggleBase({ open, onClick, size = 12, src = "/right-thin-chevron.svg" }: Props) {
    return (
        <img
            src={src}
            alt="expand"
            onClick={onClick}
            style={{
                width: size,
                cursor: "pointer",
                transition: "transform 180ms ease",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
        />
    );
}

export const ChevronToggle = memo(ChevronToggleBase);
