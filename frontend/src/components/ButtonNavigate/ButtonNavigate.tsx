import { useNavigate } from "react-router-dom";


interface ButtonNavigateProps {
    text: string;
    to: string;
    onClick?: () => void; // Optional onClick function
    className?: string; // Custom styles
}

const ButtonNavigate = ({text, to, onClick, className} : ButtonNavigateProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
      if (onClick) onClick(); // Call the custom onClick function if provided
        navigate(to); // Navigate to the specified route
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{width: "20%", padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer", alignSelf: "center", marginTop: "10px"}}
    >
        {text}
    </button>
  );
};

export default ButtonNavigate;
