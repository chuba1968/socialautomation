-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 06, 2024 at 03:19 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `automationdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `images`
--

CREATE TABLE `images` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `upload_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `image_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `images`
--

INSERT INTO `images` (`id`, `filename`, `upload_time`, `image_path`) VALUES
(14, '48559559d55ff0d6c6a61e0fcc2e5b8a', '2024-07-06 08:54:33', '/uploads/48559559d55ff0d6c6a61e0fcc2e5b8a'),
(15, '10244c7820f53dec00313789dd7bc649', '2024-07-06 08:55:00', '/uploads/10244c7820f53dec00313789dd7bc649'),
(16, '3f3c4a7842f6c5baae18565459b9e281', '2024-07-06 08:55:39', '/uploads/3f3c4a7842f6c5baae18565459b9e281'),
(17, '0d40e9862a6c61429a5f9676f74489f2', '2024-07-06 09:28:50', '/uploads/0d40e9862a6c61429a5f9676f74489f2'),
(18, 'ce80e5fc298f4e526a18884ad8262bb7', '2024-07-06 09:28:52', '/uploads/ce80e5fc298f4e526a18884ad8262bb7'),
(19, '866ae11b1a8e26ba5c2d23a1a2c87963', '2024-07-06 09:43:28', '/uploads/866ae11b1a8e26ba5c2d23a1a2c87963'),
(20, '3b2c6f041d370801a5ae04e3ef374e5f', '2024-07-06 12:44:18', '/uploads/3b2c6f041d370801a5ae04e3ef374e5f'),
(21, '3a0f79f39501c660b700729516579c71', '2024-07-06 13:08:36', '/uploads/3a0f79f39501c660b700729516579c71'),
(22, '4a145d81fc8a0308d41d5cad449e5871', '2024-07-06 13:09:18', '/uploads/4a145d81fc8a0308d41d5cad449e5871');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `images`
--
ALTER TABLE `images`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `images`
--
ALTER TABLE `images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
