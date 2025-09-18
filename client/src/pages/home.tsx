import { CategoryCarousel } from "../components/categories";
import { Environment } from "../components/enviroment";
import { HeroSection } from "../components/herosection";
import { LatestStories } from "../components/story";

const Home = () => {
  return (
    <div>
      <HeroSection />
      <CategoryCarousel />
      <Environment />
      <LatestStories />
    </div>
  );
};
export default Home;
