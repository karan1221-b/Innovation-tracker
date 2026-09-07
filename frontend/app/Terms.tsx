import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, font, radius } from "@/src/theme";

export default function Terms() {
 const router=useRouter(); const insets=useSafeAreaInsets();
 return <View style={styles.container}><ScrollView contentContainerStyle={{paddingTop:insets.top+spacing.md,paddingBottom:48}}><View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={colors.onSurface}/></Pressable><Text style={styles.title}>Terms & Conditions</Text></View><View style={styles.card}>
 <Text style={styles.heading}>Using FixIt</Text><Text style={styles.body}>FixIt is a platform intended to help customers request services and connect with service professionals. Availability, pricing, timing and service quality may depend on the individual professional and the circumstances of each request.</Text>
 <Text style={styles.heading}>Accounts</Text><Text style={styles.body}>Provide accurate information and keep your login credentials secure. You are responsible for activity performed through your account.</Text>
 <Text style={styles.heading}>Service professionals</Text><Text style={styles.body}>Professionals are responsible for the accuracy of their profiles, quotations, availability, workmanship, licences or qualifications required for the services they offer, and compliance with applicable laws.</Text>
 <Text style={styles.heading}>Bookings and payments</Text><Text style={styles.body}>A booking or quotation does not remove the customer's responsibility to review the scope and price before authorising work. Payment, cancellation and refund rules should be presented clearly at the point of transaction.</Text>
 <Text style={styles.heading}>User conduct</Text><Text style={styles.body}>Do not use FixIt for unlawful activity, harassment, fraud, malicious uploads, impersonation or attempts to access another user's information.</Text>
 <Text style={styles.heading}>Platform limitations</Text><Text style={styles.body}>FixIt may experience outages, errors or maintenance. FixIt does not guarantee that every service request will receive a match or that a professional will accept a request.</Text>
 <Text style={styles.heading}>Account deletion</Text><Text style={styles.body}>You may request deletion through Profile → Delete my account. Deletion is intended to remove the account and associated application data, subject to information that may need to be retained for legal, security or dispute-related reasons.</Text>
 <Text style={styles.heading}>Changes</Text><Text style={styles.body}>These terms may be updated as FixIt develops. Before a public commercial launch, the operator should replace this product-level summary with a legally reviewed agreement that reflects the final business model.</Text>
 <Pressable style={styles.linkRow} onPress={()=>router.push("/privacy")}><Text style={styles.link}>Read Privacy & data</Text><Ionicons name="chevron-forward" size={18} color={colors.brandPrimary}/></Pressable>
 </View></ScrollView></View>
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.surfaceSecondary},header:{flexDirection:"row",alignItems:"center",paddingHorizontal:spacing.lg,gap:spacing.sm},back:{padding:spacing.sm},title:{fontSize:font.xl,fontWeight:"700",color:colors.onSurface},card:{backgroundColor:colors.surface,margin:spacing.lg,padding:spacing.xl,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border},heading:{fontSize:font.lg,fontWeight:"700",color:colors.onSurface,marginTop:spacing.lg,marginBottom:spacing.sm},body:{fontSize:font.base,color:colors.onSurfaceSecondary,lineHeight:21},linkRow:{marginTop:spacing.xl,paddingTop:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.divider,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},link:{fontSize:font.base,fontWeight:"700",color:colors.brandPrimary}});
