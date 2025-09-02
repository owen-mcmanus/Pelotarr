import FilterBar from "../Components/FilterBar.tsx";
import {MainPanel, Category} from "../Components/MainPanel.tsx";

export default function CX() {
    return <div style={{ display:'flex', flexDirection:"column", flexGrow: 1 }}>
        <FilterBar/>
        <MainPanel category={Category.CX}/>
    </div>;
}
