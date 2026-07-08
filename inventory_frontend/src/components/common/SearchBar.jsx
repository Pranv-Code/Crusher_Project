import "./SearchBar.css";
import InputField from "./InputField";

function SearchBar({
    value,
    onChange,
    placeholder = "Search...",
}) {
    return (
        <div className="search-bar">
            <InputField
                name="search"
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    );
}

export default SearchBar;