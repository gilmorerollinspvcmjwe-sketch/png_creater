import { motion } from 'framer-motion'
import HeroSection from '../components/home/HeroSection'
import StatsSection from '../components/home/StatsSection'
import HighlightsSection from '../components/home/HighlightsSection'
import FeaturedProjects from '../components/home/FeaturedProjects'
import PetsSection from '../components/home/PetsSection'

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pt-16"
    >
      <HeroSection />
      <StatsSection />
      <HighlightsSection />
      <FeaturedProjects />
      {/* 宠物动画层 */}
      <PetsSection />
    </motion.div>
  )
}