import { useNavigate } from "react-router-dom";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Requires login</h2>
        <p className="text-gray-600 mb-6">
          You need to be logged in to continue using this feature.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="bg-gray-300 cursor-pointer hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={() => navigate("/login")}
            className="bg-black cursor-pointer hover:bg-black/80 text-white font-bold py-2 px-6 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
