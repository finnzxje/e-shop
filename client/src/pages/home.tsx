import { CategoryCarousel } from "../components/categories";
import { Enviroment } from "../components/enviroment";
import { HeroSection } from "../components/herosection";
import { LatestStories } from "../components/story";

const Home = () => {
  return (
    <div>
      <HeroSection />
      <CategoryCarousel />
      <Enviroment />
      <LatestStories />
    </div>
  );
};
export default Home;
