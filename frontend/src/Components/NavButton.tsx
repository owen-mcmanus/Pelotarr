import { NavLink, useMatch } from "react-router-dom";
import { useState } from "react";

type NavButtonProps = {
    label: string;
    icon: string;
    route: string;
}

const YELLOW = "#FFCC00";

export default function NavButton({label, icon, route}: NavButtonProps) {
    const match = useMatch({ path: route, end: false }); // set end:true for exact
    const isActive = Boolean(match);
    const [hovered, setHovered] = useState(false);

    const textColor = hovered ? YELLOW : "white";

    return (
        <div
            style={{
                borderLeft: `3px solid ${isActive ? YELLOW : "transparent"}`,
                transition: 'border-left 0.3s ease-in-out',
                boxSizing: "border-box",
            }}
        >

        <NavLink
            to={route}
            style={{
                display: 'flex',
                padding: '14px 24px',
                cursor: 'pointer',
                alignItems: 'center',
                textDecoration: "none",
                color: textColor,
                backgroundColor: isActive ? "rgb(51, 51, 51)" : "",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >

            <img src={icon} alt="icon" style={{display: 'block', width:'12.25px', height:'14px', marginRight:'7px', textAlign: 'center'}}/>
            <span style={{ lineHeight: 1 }}>{label}</span>
        </NavLink>
        </div>
    );
}
