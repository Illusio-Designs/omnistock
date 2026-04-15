-- CreateTable
CREATE TABLE `public_content` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM(
      'LANDING_CHALLENGE',
      'LANDING_FEATURE_TOOL',
      'LANDING_FAQ',
      'FEATURE',
      'SOLUTION',
      'ABOUT_SECTION',
      'ABOUT_VALUE',
      'ABOUT_TIMELINE',
      'HELP_CATEGORY',
      'HELP_FAQ',
      'RESOURCE_TILE',
      'VIDEO',
      'CASE_STUDY'
    ) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` TEXT NULL,
    `body` LONGTEXT NULL,
    `image` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `href` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `data` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `public_content_slug_key`(`slug`),
    INDEX `public_content_type_isActive_sortOrder_idx`(`type`, `isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
