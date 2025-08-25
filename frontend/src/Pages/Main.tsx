import FilterBar from "../Components/FilterBar.tsx";
import MainPanel from "../Components/MainPanel.tsx";

export default function Main() {
    return <div style={{ display:'flex', flexDirection:"column", flexGrow: 1 }}>
        <FilterBar/>
        <MainPanel/>
        </div>;
}
