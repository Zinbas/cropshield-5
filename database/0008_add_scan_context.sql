-- CropShield 5: optional field context and manually tracked recommendation progress.
ALTER TABLE `scans`
  ADD `soilType` varchar(120),
  ADD `soilPh` decimal(4,2),
  ADD `soilMoisture` varchar(80),
  ADD `cropCount` int,
  ADD `landArea` decimal(10,2),
  ADD `landUnit` varchar(24),
  ADD `fieldNotes` text,
  ADD `recommendationProgress` text;
