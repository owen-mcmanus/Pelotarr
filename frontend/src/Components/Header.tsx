export default function Header(){
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
                }}
                src="/pelotarr-logo.svg"
                alt="Logo"
            />
        </div>
    );
}