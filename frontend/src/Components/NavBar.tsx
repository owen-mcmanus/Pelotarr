import NavButton from "./NavButton.tsx";

export default function NavBar(){
    return (
        <div
            style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                display: "inline-flex",
                flexDirection: "column",
                width: "210px",
            }}
        >
            <NavButton label={"Men"} icon={"/play.svg"} route={"/men"} />
            <NavButton label={"Women"} icon={"/play.svg"} route={"/women"} />
            <NavButton label={"Cyclo-Cross"} icon={"/play.svg"} route={"/cx"} />
            <NavButton label={"Calendar"} icon={"/calendar.svg"} route={"/calendar"}/>
            <NavButton label={"Settings"} icon={"/settings.svg"} route={"/settings"}/>

        </div>
    );
}