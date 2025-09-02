import FilterBar from "../Components/FilterBar.tsx";
import {MainPanel, Category} from "../Components/MainPanel.tsx";

export default function Search() {
    return <div style={{ display:'flex', flexDirection:"column", flexGrow: 1  }}>
        <FilterBar/>
        <MainPanel category={Category.SEARCH}/>
    </div>;
}

