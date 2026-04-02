import { motion } from 'framer-motion'
import { MapPin, Calendar, Mail, ExternalLink } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import profileData from '../../data/profile.json'

export default function ProfileCard() {
  const { name, title, location, email, social, coreSkills } = profileData

  return (
    <Card glass className="relative overflow-hidden">
      {/* Avatar placeholder */}
      <div className="flex items-start gap-6 mb-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center"
        >
          <span className="text-white font-bold text-2xl">徐</span>
        </motion.div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-dark-100 mb-1">{name}</h2>
          <p className="text-dark-400 mb-3">{title}</p>
          <div className="flex flex-wrap gap-2">
            {coreSkills.map((skill) => (
              <Badge key={skill} variant="primary" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-dark-400">
          <MapPin className="w-4 h-4 text-accent-primary" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-3 text-dark-400">
          <Calendar className="w-4 h-4 text-accent-primary" />
          <span>3 年 AI 产品经验</span>
        </div>
        <div className="flex items-center gap-3 text-dark-400">
          <Mail className="w-4 h-4 text-accent-primary" />
          <span>{email}</span>
        </div>
      </div>

      {/* Social links */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-dark-700/50">
        {Object.entries(social).map(([platform, url]) => (
          <motion.a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-accent-primary hover:border-accent-primary/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="text-sm capitalize">{platform}</span>
          </motion.a>
        ))}
      </div>

      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent-primary/10 to-transparent rounded-bl-full" />
    </Card>
  )
}